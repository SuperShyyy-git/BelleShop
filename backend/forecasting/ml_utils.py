"""
Machine Learning Utilities for Demand Forecasting
Location: forecasting/ml_utils.py
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Max
from django.db.models.functions import TruncDate

# Scikit-Learn Imports
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Model Imports
# We assume Product is still in the 'inventory' app and Sales in 'pos' app
from pos.models import SalesTransaction, TransactionItem
from inventory.models import Product


def prepare_training_data(product, days=90):
    """
    Prepare training data from product sales history.
    Returns: X (features), y (targets), dates
    """
    try:
        print(f"🔍 Starting data preparation for product: {product.name} (ID: {product.pk})")
        
        # 1. Determine the latest sale date
        latest_date_obj = SalesTransaction.objects.filter(
            items__product=product,
            status='COMPLETED'
        ).aggregate(max_date=Max('created_at'))

        if not latest_date_obj['max_date']:
            print(f"⚠️ No sales data found for product {product.pk}")
            return None, None, None
            
        end_date = latest_date_obj['max_date'].date()
        start_date = end_date - timedelta(days=days - 1)
        
        print(f"📅 Preparing data for range: {start_date} to {end_date}")

        # 2. Query TransactionItem and aggregate by date
        sales_data = TransactionItem.objects.filter(
            product=product,
            transaction__created_at__date__gte=start_date,
            transaction__created_at__date__lte=end_date,
            transaction__status='COMPLETED'
        ).annotate(
            date=TruncDate('transaction__created_at')
        ).values('date').annotate(
            total_quantity=Sum('quantity')
        ).order_by('date')
        
        sales_list = list(sales_data)
        
        if len(sales_list) < 14:
            print(f"⚠️ Insufficient sales data: only {len(sales_list)} days found")
            return None, None, None
        
        # 3. Create DataFrame
        dates = [record['date'] for record in sales_list]
        quantities = [record['total_quantity'] for record in sales_list]
        
        df = pd.DataFrame({'date': dates, 'quantity': quantities})
        
        # Fill missing dates with 0
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date').reindex(date_range, fill_value=0).reset_index()
        df.columns = ['date', 'quantity']
        
        # 4. Feature Engineering (Must match predict_demand_rf exactly)
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Lag features
        df['lag_1'] = df['quantity'].shift(1).fillna(0)
        df['lag_7'] = df['quantity'].shift(7).fillna(0)
        df['rolling_mean_7'] = df['quantity'].rolling(window=7, min_periods=1).mean()
        df['rolling_mean_14'] = df['quantity'].rolling(window=14, min_periods=1).mean()
        
        df = df.fillna(0)
        
        feature_columns = [
            'day_of_week', 'day_of_month', 'month', 'is_weekend',
            'lag_1', 'lag_7', 'rolling_mean_7', 'rolling_mean_14'
        ]
        
        X = df[feature_columns].values
        y = df['quantity'].values
        dates = df['date'].values
        
        print(f"✅ Prepared {len(X)} samples. Avg Sales: {y.mean():.2f}")
        return X, y, dates
        
    except Exception as e:
        print(f"❌ Error preparing training data: {str(e)}")
        return None, None, None


def train_random_forest_model(product, days=90):
    """
    Train a Random Forest model (Better for seasonality/irregular patterns)
    """
    try:
        print(f"\n🌲 Starting Random Forest training for product: {product.name}")
        
        # 1. Reuse existing robust data preparation
        X, y, dates = prepare_training_data(product, days)
        
        if X is None or len(X) < 14:
            return None, None, None, None
        
        # 2. Split into train/test
        split_index = int(len(X) * 0.8)
        X_train, X_test = X[:split_index], X[split_index:]
        y_train, y_test = y[:split_index], y[split_index:]
        
        # 3. Train Random Forest
        # n_estimators=100 creates 100 decision trees
        model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        
        # 4. Evaluate
        y_pred = model.predict(X_test)
        
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Calculate accuracy (within 20% of actual)
        percentage_errors = np.abs((y_test - y_pred) / (y_test + 1)) * 100
        accuracy = np.mean(percentage_errors <= 20) * 100
        
        metrics = {
            'mse': float(mse),
            'rmse': float(rmse),
            'mae': float(mae),
            'r2_score': float(r2),
            'accuracy': float(accuracy)
        }
        
        info = {
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'features_used': X.shape[1],
            'training_period_days': days
        }
        
        print(f"✅ Random Forest trained! RMSE={rmse:.2f}, Accuracy={accuracy:.2f}%")
        
        return model, None, metrics, info
        
    except Exception as e:
        print(f"❌ Error training RF model: {str(e)}")
        return None, None, None, None


def predict_demand_rf(model, product, forecast_date, historical_data=None):
    """
    Specific prediction function for Random Forest
    """
    try:
        # 1. Create features (Must match prepare_training_data EXACTLY)
        day_of_week = forecast_date.weekday()
        day_of_month = forecast_date.day
        month = forecast_date.month
        is_weekend = 1 if day_of_week in [5, 6] else 0
        
        # 2. Calculate Lags & Rolling Means from historical data
        if historical_data and len(historical_data) > 0:
            lag_1 = historical_data[-1] if len(historical_data) >= 1 else 0
            lag_7 = historical_data[-7] if len(historical_data) >= 7 else 0
            rolling_mean_7 = np.mean(historical_data[-7:]) if len(historical_data) >= 7 else 0
            rolling_mean_14 = np.mean(historical_data[-14:]) if len(historical_data) >= 14 else 0
        else:
            # Fallback
            lag_1 = product.current_stock / 30 
            lag_7 = lag_1
            rolling_mean_7 = lag_1
            rolling_mean_14 = lag_1
        
        # 3. Create feature array
        features = np.array([[
            day_of_week, day_of_month, month, is_weekend,
            lag_1, lag_7, rolling_mean_7, rolling_mean_14
        ]])
        
        # 4. Predict
        prediction = model.predict(features)[0]
        prediction = max(0, int(prediction))
        
        # 5. Confidence Interval (Heuristic for RF)
        conf_lower = max(0, int(prediction * 0.85))
        conf_upper = int(prediction * 1.15)
        
        return prediction, (conf_lower, conf_upper)
        
    except Exception as e:
        print(f"❌ Error making RF prediction: {str(e)}")
        fallback = int(product.current_stock / 30)
        return fallback, (int(fallback * 0.8), int(fallback * 1.2))


def generate_stock_recommendation(product, forecast):
    """
    Generate stock recommendation based on forecast
    """
    try:
        current_stock = product.current_stock
        
        # Handle missing reorder_point
        reorder_point = getattr(product, 'reorder_point', None)
        if reorder_point is None:
            reorder_point = int(current_stock * 0.2)
        
        predicted_demand = forecast.predicted_demand
        
        if predicted_demand > 0:
            days_until_stockout = current_stock / predicted_demand
        else:
            days_until_stockout = 999
        
        # Determine priority
        if days_until_stockout < 7:
            priority = 'CRITICAL'
            action = 'URGENT_ORDER'
        elif days_until_stockout < 14:
            priority = 'HIGH'
            action = 'ORDER_SOON'
        elif current_stock < reorder_point:
            priority = 'MEDIUM'
            action = 'REORDER'
        else:
            priority = 'LOW'
            action = 'MONITOR'
        
        # Calculate recommended order (30 days cover + 7 days safety)
        safety_stock = int(predicted_demand * 7)
        recommended_order = max(0, int((predicted_demand * 30) - current_stock + safety_stock))
        
        reason = f"Stock: {current_stock}, Burn Rate: {predicted_demand}/day"
        
        return {
            'priority': priority,
            'action': action,
            'recommended_order_quantity': recommended_order,
            'reason': reason,
            'days_until_stockout': int(days_until_stockout) if days_until_stockout < 999 else None
        }
        
    except Exception as e:
        print(f"❌ Error generating recommendation: {str(e)}")
        return {
            'priority': 'LOW', 'action': 'MONITOR', 
            'recommended_order_quantity': 0, 'reason': 'Error', 'days_until_stockout': None
        }