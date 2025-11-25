import pandas as pd
import numpy as np
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

from inventory.models import InventoryMovement, Product
from .models import ForecastModel, ProductForecast, StockRecommendation
from . import ml_utils
from .serializers import ProductForecastCreateSerializer


class ForecastingMixin:
    """Helper class to handle data loading and model training (General, not product-specific)"""
    
    def get_sales_data(self):
        # 1. FETCH DATA (General, ALL products)
        movements = InventoryMovement.objects.filter(
            movement_type='SALE'
        ).values('created_at', 'quantity')

        if not movements:
            return None

        # 2. CONVERT TO DATAFRAME
        df = pd.DataFrame(list(movements))
        
        # 3. PREPROCESS
        df['date'] = pd.to_datetime(df['created_at']).dt.date
        
        # 4. AGGREGATE (CRITICAL FIX)
        daily_sales = df.groupby('date')['quantity'].sum().reset_index()
        daily_sales.columns = ['date', 'total_amount']
        
        # Fill missing dates with 0 sales (important for time series)
        daily_sales['date'] = pd.to_datetime(daily_sales['date'])
        daily_sales = daily_sales.sort_values('date')
        
        # 5. FEATURE ENGINEERING
        daily_sales['day_of_week'] = daily_sales['date'].dt.dayofweek
        daily_sales['month'] = daily_sales['date'].dt.month
        daily_sales['day'] = daily_sales['date'].dt.day
        daily_sales['year'] = daily_sales['date'].dt.year
        
        return daily_sales

    def train_model(self, df):
        if df is None or len(df) < 10: 
            return None, None

        features = ['day_of_week', 'month', 'day', 'year']
        X = df[features]
        y = df['total_amount']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)

        predictions = model.predict(X_test)
        mae = mean_absolute_error(y_test, predictions)
        
        return model, mae


class ForecastDashboardView(APIView, ForecastingMixin):
    permission_classes = [AllowAny] 
    
    def get(self, request):
        try:
            df = self.get_sales_data()
            if df is None:
                return Response({
                    "total_items_sold": 0, 
                    "avg_daily_items": 0, 
                    "sales_growth": 0,
                    "data_points": 0
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
            print(f"Error in dashboard stats: {e}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateForecastView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("\n" + "="*70)
        print("🚀 GENERATE FORECAST REQUEST RECEIVED")
        print("="*70)
        
        # 1. Validate Input Data
        serializer = ProductForecastCreateSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"❌ Validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        product_id = validated_data.get('product_id')
        forecast_days = validated_data.get('forecast_days')
        training_days = validated_data.get('training_days')

        print(f"📦 Product ID: {product_id}")
        print(f"📅 Forecast days: {forecast_days}")
        print(f"📊 Training days: {training_days}")

        try:
            product = Product.objects.get(pk=product_id)
            print(f"✅ Product found: {product.name} (Stock: {product.current_stock})")
        except Product.DoesNotExist:
            print(f"❌ Product not found: {product_id}")
            return Response(
                {"product_id": f"Product with ID {product_id} not found."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 2. Train Model
            print("\n📈 Training model...")
            model, scaler, metrics, info = ml_utils.train_linear_regression_model(product, days=training_days)
            
            if model is None:
                print("❌ Model training failed - insufficient data")
                return Response(
                    {"error": "Insufficient sales data to train a reliable model. Need at least 14 days of sales for this product."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            print(f"✅ Model trained - Accuracy: {metrics['accuracy']:.2f}%")

            # 3. Create or get ForecastModel record
            print("\n💾 Saving forecast model to database...")
            training_start = timezone.now().date() - timedelta(days=training_days)
            training_end = timezone.now().date()
            
            forecast_model, created = ForecastModel.objects.get_or_create(
                name=f"LR_{product.name}_{timezone.now().strftime('%Y%m%d')}",
                defaults={
                    'model_type': 'LINEAR_REGRESSION',
                    'version': '1.0',
                    'status': 'ACTIVE',
                    'parameters': {},
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
            
            if created:
                print(f"✅ Created new ForecastModel: {forecast_model.name}")
            else:
                print(f"ℹ️ Using existing ForecastModel: {forecast_model.name}")

            # 4. Generate and SAVE Forecasts
            print(f"\n🔮 Generating {forecast_days} days of forecasts...")
            last_date = timezone.now().date()
            future_predictions = []
            
            # Get historical data for predictions
            X_all, y_all, dates_all = ml_utils.prepare_training_data(product, days=training_days)
            historical_data = list(y_all)

            # Delete old forecasts for this product
            deleted_count = ProductForecast.objects.filter(
                product=product,
                forecast_date__gte=last_date
            ).delete()[0]
            print(f"🗑️ Deleted {deleted_count} old forecasts")

            saved_forecasts = 0
            for i in range(1, forecast_days + 1):
                future_date = last_date + timedelta(days=i)
                
                # Predict
                pred_qty, confidence_interval = ml_utils.predict_demand(
                    model=model, 
                    scaler=scaler, 
                    product=product,
                    forecast_date=future_date, 
                    historical_data=historical_data
                )
                
                # CRITICAL: Save to database
                product_forecast = ProductForecast.objects.create(
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
                    "id": product_forecast.id,
                    "date": future_date.strftime("%Y-%m-%d"),
                    "predicted_demand": int(pred_qty),
                    "confidence_lower": confidence_interval[0],
                    "confidence_upper": confidence_interval[1],
                })

                # Append prediction for next iteration
                historical_data.append(pred_qty)

            print(f"✅ Saved {saved_forecasts} forecasts to database")

            # 5. Generate Stock Recommendation
            print("\n💡 Generating stock recommendation...")
            
            # Use the first forecast (tomorrow's prediction) for recommendation
            first_forecast = ProductForecast.objects.filter(
                product=product,
                forecast_date=last_date + timedelta(days=1)
            ).first()
            
            if first_forecast:
                recommendation_data = ml_utils.generate_stock_recommendation(product, first_forecast)
                
                # Delete old recommendations
                StockRecommendation.objects.filter(
                    product=product,
                    status='PENDING'
                ).delete()
                
                # Create new recommendation
                stock_rec = StockRecommendation.objects.create(
                    product=product,
                    forecast=first_forecast,
                    current_stock=product.current_stock,
                    recommended_order_quantity=recommendation_data['recommended_order_quantity'],
                    reason=recommendation_data['reason'],
                    priority=recommendation_data['priority'],
                    status='PENDING'
                )
                print(f"✅ Stock recommendation saved: {stock_rec.priority} priority")

            print("\n" + "="*70)
            print("✅ FORECAST GENERATION COMPLETE")
            print("="*70 + "\n")

            return Response({
                "success": True,
                "message": f"Generated {saved_forecasts} forecasts for {product.name}",
                "product_id": product_id,
                "forecast_model_id": forecast_model.id,
                "forecast_model_info": metrics,
                "forecast_days": forecast_days,
                "forecasts_saved": saved_forecasts,
                "forecast": future_predictions[:7],  # Return first 7 days
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            print("\n" + "="*70)
            print("❌ ERROR IN FORECAST GENERATION")
            print("="*70)
            traceback.print_exc()
            print("="*70 + "\n")
            
            return Response(
                {"error": f"Internal Server Error during forecast generation: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ForecastSummaryView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, product_id):
        """Get forecast summary for a specific product"""
        print(f"\n🔍 Fetching forecast summary for product ID: {product_id}")
        
        try:
            product = Product.objects.get(id=product_id)
            
            # Get the latest forecasts
            today = timezone.now().date()
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
            
            # Calculate totals
            demand_7_days = sum(f.predicted_demand for f in forecasts_7) if forecasts_7.exists() else 0
            demand_30_days = sum(f.predicted_demand for f in forecasts_30) if forecasts_30.exists() else 0
            
            # Get latest recommendation
            latest_rec = StockRecommendation.objects.filter(
                product=product,
                status='PENDING'
            ).order_by('-created_at').first()
            
            # Calculate days until stockout
            if demand_7_days > 0:
                avg_daily_demand = demand_7_days / 7
                days_until_stockout = int(product.current_stock / avg_daily_demand) if avg_daily_demand > 0 else 999
            else:
                days_until_stockout = 999
            
            result = {
                "product_id": product.id,
                "product_name": product.name,
                "product_sku": product.sku,
                "current_stock": product.current_stock,
                "forecast_7_days": demand_7_days,
                "forecast_30_days": demand_30_days,
                "recommended_order": latest_rec.recommended_order_quantity if latest_rec else 0,
                "days_until_stockout": days_until_stockout if days_until_stockout < 999 else None,
                "priority": latest_rec.priority if latest_rec else 'NORMAL',
                "trend": "stable",
                "seasonal_impact": "none"
            }
            
            print(f"✅ Summary data: {result}")
            return Response(result)
            
        except Product.DoesNotExist:
            print(f"❌ Product {product_id} not found")
            return Response(
                {"error": "Product not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )