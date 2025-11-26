import pandas as pd
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

# IMPORTS
# 1. Core Inventory/Product models (from 'inventory' app)
from inventory.models import InventoryMovement, Product

# 2. Forecasting models (from CURRENT 'forecasting' app)
from .models import ForecastModel, ProductForecast, StockRecommendation

# 3. Local Utilities
from . import ml_utils
from .serializers import ProductForecastCreateSerializer


class ForecastingMixin:
    """Helper class to handle data loading for dashboard stats"""
    
    def get_sales_data(self):
        # Fetch generic sales data for the dashboard summary
        movements = InventoryMovement.objects.filter(
            movement_type='SALE'
        ).values('created_at', 'quantity')

        if not movements:
            return None

        df = pd.DataFrame(list(movements))
        df['date'] = pd.to_datetime(df['created_at']).dt.date
        
        # Aggregate
        daily_sales = df.groupby('date')['quantity'].sum().reset_index()
        daily_sales.columns = ['date', 'total_amount']
        
        # Fill missing dates for smoother graphs
        daily_sales['date'] = pd.to_datetime(daily_sales['date'])
        daily_sales = daily_sales.sort_values('date')
        
        return daily_sales


class ForecastDashboardView(APIView, ForecastingMixin):
    permission_classes = [AllowAny] 
    
    def get(self, request):
        try:
            df = self.get_sales_data()
            if df is None:
                return Response({
                    "total_items_sold": 0, "avg_daily_items": 0, 
                    "sales_growth": 0, "data_points": 0
                })

            total_items_sold = df['total_amount'].sum()
            avg_daily_sales = df['total_amount'].mean()

            end_date = df['date'].max()
            start_date_30 = end_date - timedelta(days=30)
            start_date_60 = end_date - timedelta(days=60)

            current_period = df[(df['date'] > start_date_30) & (df['date'] <= end_date)]['total_amount'].sum()
            previous_period = df[(df['date'] > start_date_60) & (df['date'] <= start_date_30)]['total_amount'].sum()

            growth = 0
            if previous_period > 0:
                growth = ((current_period - previous_period) / previous_period) * 100

            return Response({
                "total_items_sold": total_items_sold,
                "avg_daily_items": round(avg_daily_sales, 2),
                "sales_growth": round(growth, 2),
                "data_points": len(df)
            })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateForecastView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("\n" + "="*70)
        print("🚀 GENERATE FORECAST REQUEST (RANDOM FOREST)")
        print("="*70)
        
        # 1. Validate Input
        serializer = ProductForecastCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        product_id = validated_data.get('product_id')
        forecast_days = validated_data.get('forecast_days')
        training_days = validated_data.get('training_days')

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            # 2. Train Model (RANDOM FOREST)
            print("\n📈 Training Random Forest model...")
            
            # Using ml_utils in forecasting/ml_utils.py
            model, scaler, metrics, info = ml_utils.train_random_forest_model(product, days=training_days)
            
            if model is None:
                return Response(
                    {"error": "Insufficient sales data (need 14+ days) to train model."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            print(f"✅ Model trained - Accuracy: {metrics['accuracy']:.2f}%")

            # 3. Save Forecast Model
            print("\n💾 Saving forecast model...")
            training_start = timezone.now().date() - timedelta(days=training_days)
            training_end = timezone.now().date()
            
            forecast_model, created = ForecastModel.objects.get_or_create(
                name=f"RF_{product.name}_{timezone.now().strftime('%Y%m%d')}",
                defaults={
                    'model_type': 'RANDOM_FOREST',
                    'version': '2.0',
                    'status': 'ACTIVE',
                    'parameters': {'n_estimators': 100},
                    'r2_score': metrics['r2_score'],
                    'mse': metrics['mse'],
                    'rmse': metrics['rmse'],
                    'mae': metrics['mae'],
                    'accuracy': metrics['accuracy'],
                    'training_start_date': training_start,
                    'training_end_date': training_end,
                    'training_samples': info['training_samples'],
                    'is_active': True,
                }
            )

            # 4. Generate Predictions
            print(f"\n🔮 Generating {forecast_days} days of forecasts...")
            last_date = timezone.now().date()
            future_predictions = []
            
            # Get history for rolling windows
            X_all, y_all, dates_all = ml_utils.prepare_training_data(product, days=training_days)
            historical_data = list(y_all)

            # Clear old forecasts
            ProductForecast.objects.filter(
                product=product,
                forecast_date__gte=last_date
            ).delete()

            saved_forecasts = 0
            for i in range(1, forecast_days + 1):
                future_date = last_date + timedelta(days=i)
                
                # Predict using RF specific function
                pred_qty, confidence_interval = ml_utils.predict_demand_rf(
                    model=model, 
                    product=product,
                    forecast_date=future_date, 
                    historical_data=historical_data
                )
                
                ProductForecast.objects.create(
                    product=product,
                    forecast_model=forecast_model,
                    forecast_date=future_date,
                    predicted_demand=int(pred_qty),
                    confidence_lower=confidence_interval[0],
                    confidence_upper=confidence_interval[1],
                    confidence_level=95.0,
                    is_peak_season=False,
                    seasonal_factor=1.0
                )
                saved_forecasts += 1
                
                future_predictions.append({
                    "date": future_date.strftime("%Y-%m-%d"),
                    "predicted_demand": int(pred_qty),
                    "confidence_lower": confidence_interval[0],
                    "confidence_upper": confidence_interval[1],
                })

                # Append prediction to history so next day's lag/rolling mean is accurate
                historical_data.append(pred_qty)

            # 5. Generate Stock Recommendation
            print("\n💡 Generating stock recommendation...")
            first_forecast = ProductForecast.objects.filter(
                product=product,
                forecast_date=last_date + timedelta(days=1)
            ).first()
            
            if first_forecast:
                recommendation_data = ml_utils.generate_stock_recommendation(product, first_forecast)
                
                StockRecommendation.objects.filter(product=product, status='PENDING').delete()
                
                StockRecommendation.objects.create(
                    product=product,
                    forecast=first_forecast,
                    current_stock=product.current_stock,
                    recommended_order_quantity=recommendation_data['recommended_order_quantity'],
                    reason=recommendation_data['reason'],
                    priority=recommendation_data['priority'],
                    status='PENDING'
                )

            return Response({
                "success": True,
                "message": f"Generated {saved_forecasts} RF forecasts",
                "accuracy": metrics['accuracy'],
                "forecast": future_predictions[:7],
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Internal Server Error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ForecastSummaryView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, product_id):
        """Get forecast summary for a specific product"""
        try:
            # Assumes Product is in inventory app
            product = Product.objects.get(id=product_id)
            today = timezone.now().date()
            
            # Forecasts are in forecasting app
            forecasts_7 = ProductForecast.objects.filter(
                product=product,
                forecast_date__gte=today,
                forecast_date__lte=today + timedelta(days=7)
            )
            
            forecasts_30 = ProductForecast.objects.filter(
                product=product,
                forecast_date__gte=today,
                forecast_date__lte=today + timedelta(days=30)
            )
            
            demand_7 = sum(f.predicted_demand for f in forecasts_7)
            demand_30 = sum(f.predicted_demand for f in forecasts_30)
            
            latest_rec = StockRecommendation.objects.filter(
                product=product, status='PENDING'
            ).order_by('-created_at').first()
            
            # Stockout Calc
            if demand_7 > 0:
                avg_daily = demand_7 / 7
                days_until_stockout = int(product.current_stock / avg_daily)
            else:
                days_until_stockout = 999
            
            return Response({
                "product_name": product.name,
                "current_stock": product.current_stock,
                "forecast_7_days": demand_7,
                "forecast_30_days": demand_30,
                "recommended_order": latest_rec.recommended_order_quantity if latest_rec else 0,
                "days_until_stockout": days_until_stockout if days_until_stockout < 999 else None,
                "priority": latest_rec.priority if latest_rec else 'NORMAL',
            })
            
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)