import pandas as pd
import numpy as np
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated # FIX: Moved AllowAny import here
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

from inventory.models import InventoryMovement, Product

class ForecastingMixin:
    """Helper class to handle data loading and model training"""
    
    # FIX: Added product_id=None to accept the filter from the views
    def get_sales_data(self, product_id=None): 
        # 1. FETCH DATA FROM INVENTORY MOVEMENTS
        movements = InventoryMovement.objects.filter(
            movement_type='SALE'
        )
        
        # NEW: Filter by product_id if provided (Crucial Fix)
        if product_id:
            # Note: The Product ID passed from the frontend is used here
            movements = movements.filter(product_id=product_id) 

        if not movements.exists(): # Check if the filtered queryset is empty
            return None

        # 2. CONVERT TO DATAFRAME
        df = pd.DataFrame(list(movements.values('created_at', 'quantity'))) # Use .values() from filtered queryset
        
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
            # NOTE: This dashboard is currently showing ALL sales data, not filtered by product.
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

class GenerateForecastView(APIView, ForecastingMixin):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            # NEW: Read product_id from the JSON body sent by the frontend
            product_id = request.data.get('product_id') 
            
            if not product_id:
                return Response({"error": "Product ID is required for forecasting."}, status=status.HTTP_400_BAD_REQUEST)

            # 1. Get Data - PASS THE product_id
            df = self.get_sales_data(product_id=product_id) 
            
            if df is None:
                return Response(
                    {"error": "No sales history found for this product."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Train Model
            model, mae = self.train_model(df)
            if model is None:
                return Response(
                    {"error": "Insufficient data for training (need at least 10 days of sales)."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. Generate Future Dates (Next 7 days)
            last_date = df['date'].max()
            future_predictions = []
            
            for i in range(1, 8):
                future_date = last_date + timedelta(days=i)
                
                features = pd.DataFrame([{
                    'day_of_week': future_date.dayofweek,
                    'month': future_date.month,
                    'day': future_date.day,
                    'year': future_date.year
                }])
                
                pred_qty = model.predict(features)[0]
                
                future_predictions.append({
                    "date": future_date.strftime("%Y-%m-%d"),
                    "predicted_amount": round(max(0, pred_qty), 0),
                    "confidence": "High" if mae < 5 else "Moderate"
                })

            return Response({
                "forecast": future_predictions,
                "model_accuracy": {
                    "mae": round(mae, 2),
                    "note": f"On average, predictions are off by {round(mae, 1)} units."
                }
            })

        except Exception as e:
            print(f"Error generating forecast: {e}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ForecastSummaryView(APIView, ForecastingMixin):
    permission_classes = [AllowAny]
    
    """Returns actual sales data for the chart"""
    # FIX: Added product_id=None parameter
    def get(self, request, days=30): 
        try:
            # NOTE: This view still calculates based on ALL products for the chart data
            # To filter this summary by product, you would need to adjust the frontend
            # to pass the product_id as a query parameter (e.g., /summary/30/?product_id=1)
            # and update this view to read that query param.
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