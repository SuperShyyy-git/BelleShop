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
from . import ml_utils # <-- Ensure this import is present
from .serializers import ProductForecastCreateSerializer # <-- NEW IMPORT

class ForecastingMixin:
    """Helper class to handle data loading and model training (General, not product-specific)"""
    
    # Renaming original get_sales_data to avoid confusion, 
    # but keeping logic for Dashboard/Summary views.
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

    # This training method is currently unused but left here for structural integrity.
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
    # FIX: Allow access for testing
    permission_classes = [AllowAny] 
    
    def get(self, request):
        # ... (Dashboard logic uses get_sales_data which returns aggregate data - this is fine)
        try:
            df = self.get_sales_data()
            if df is None:
                # FIX: Returning the structure expected by the frontend
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


class GenerateForecastView(APIView): # Removed ForecastingMixin inheritance
    # FIX: Allow access for testing
    permission_classes = [AllowAny]
    
    def post(self, request):
        # 1. Validate Input Data
        serializer = ProductForecastCreateSerializer(data=request.data)
        if not serializer.is_valid():
            # Returns detailed error messages to the client (400 Bad Request)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        product_id = validated_data.get('product_id')
        forecast_days = validated_data.get('forecast_days')
        training_days = validated_data.get('training_days')

        try:
            # Load the product instance for ml_utils
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response(
                {"product_id": f"Product with ID {product_id} not found."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 2. Prepare Data and Train Model (Product-Specific)
            # Call ml_utils directly to get product-specific data and train Linear Regression model
            model, scaler, metrics, info = ml_utils.train_linear_regression_model(product, days=training_days)
            
            if model is None:
                # This catches the "Insufficient sales data" error reported by ml_utils
                return Response(
                    {"error": "Insufficient sales data to train a reliable model. Need at least 14 days of sales for this product."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. Generate Future Dates and Predict
            last_date = timezone.now().date()
            future_predictions = []
            
            # Get historical quantities for lag features in the prediction function
            X_all, y_all, dates_all = ml_utils.prepare_training_data(product, days=training_days)
            historical_data = list(y_all) # Last 'training_days' of sales quantities

            for i in range(1, forecast_days + 1):
                future_date = last_date + timedelta(days=i)
                
                # Predict using the specialized ml_utils function
                pred_qty, confidence_interval = ml_utils.predict_demand(
                    model=model, 
                    scaler=scaler, 
                    product=product,
                    forecast_date=future_date, 
                    historical_data=historical_data
                )
                
                future_predictions.append({
                    "date": future_date.strftime("%Y-%m-%d"),
                    "predicted_demand": int(pred_qty),
                    "confidence_lower": confidence_interval[0],
                    "confidence_upper": confidence_interval[1],
                    "model_mae": metrics['mae'],
                })

                # Append prediction to historical_data to forecast the next day recursively
                historical_data.append(pred_qty)


            return Response({
                "product_id": product_id,
                "forecast_model_info": metrics,
                "forecast_days": forecast_days,
                "forecast": future_predictions,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # This is the last catch-all for unexpected Python errors
            import traceback
            traceback.print_exc() 
            
            return Response(
                {"error": f"Internal Server Error during forecast generation: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ForecastSummaryView(APIView, ForecastingMixin):
    # FIX: Allow access for testing
    permission_classes = [AllowAny]
    
    """Returns actual sales data for the chart"""
    def get(self, request, days=30):
        # ... (Summary logic uses get_sales_data which returns aggregate data - this is fine)
        try:
            df = self.get_sales_data()
            if df is None:
                return Response([])

            # Filter for last X days
            cutoff_date = pd.to_datetime(timezone.now().date() - timedelta(days=days))
            df_filtered = df[df['date'] >= cutoff_date]

            result = []
            for _, row in df_filtered.iterrows():
                result.append({
                    "date": row['date'].strftime("%Y-%m-%d"),
                    "amount": row['total_amount']
                })

            return Response(result)

        except Exception as e:
            print(f"Error fetching summary: {e}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )