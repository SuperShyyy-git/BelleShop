import csv
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowerbelle_backend.settings')

import django
django.setup()

from datetime import datetime, timedelta, date
from decimal import Decimal
import random
from django.db import models, transaction
from django.utils import timezone
from accounts.models import User, AuditLog
from inventory.models import Category, Supplier, Product, InventoryMovement, LowStockAlert
from pos.models import SalesTransaction, TransactionItem, Cart, CartItem, PaymentTransaction
from forecasting.models import (
    ForecastModel, ProductForecast, CategoryForecast, 
    SeasonalPattern, StockRecommendation
)
from reports.models import ReportSchedule, ReportExport, DashboardMetric


print("Starting seed data generation...")

# Clear existing data (optional - comment out if you want to keep existing data)
print("Clearing existing data...")
StockRecommendation.objects.all().delete()
ProductForecast.objects.all().delete()
CategoryForecast.objects.all().delete()
ForecastModel.objects.all().delete()
SeasonalPattern.objects.all().delete()
PaymentTransaction.objects.all().delete()
TransactionItem.objects.all().delete()
SalesTransaction.objects.all().delete()
CartItem.objects.all().delete()
Cart.objects.all().delete()
InventoryMovement.objects.all().delete()
LowStockAlert.objects.all().delete()
Product.objects.all().delete()
Supplier.objects.all().delete()
Category.objects.all().delete()
ReportExport.objects.all().delete()
ReportSchedule.objects.all().delete()
DashboardMetric.objects.all().delete()
AuditLog.objects.all().delete()
User.objects.all().delete()

print("Creating users...")
# Create users
owner = User.objects.create_superuser(
    username='admin',
    email='admin@flowershop.com',
    password='admin123',
    full_name='Shop Owner',
    role='OWNER',
    phone='+639171234567'
)

staff1 = User.objects.create_user(
    username='maria',
    email='maria@flowershop.com',
    password='staff123',
    full_name='Maria Santos',
    role='STAFF',
    phone='+639171234568'
)

staff2 = User.objects.create_user(
    username='juan',
    email='juan@flowershop.com',
    password='staff123',
    full_name='Juan dela Cruz',
    role='STAFF',
    phone='+639171234569'
)

print("Creating categories...")
# Create categories
categories_data = [
    {'name': 'Roses', 'description': 'Various types of roses including red, white, pink'},
    {'name': 'Tulips', 'description': 'Colorful tulips for all occasions'},
    {'name': 'Lilies', 'description': 'Elegant lilies including stargazer and calla'},
    {'name': 'Orchids', 'description': 'Exotic orchids and arrangements'},
    {'name': 'Sunflowers', 'description': 'Bright and cheerful sunflowers'},
    {'name': 'Mixed Bouquets', 'description': 'Pre-arranged mixed flower bouquets'},
    {'name': 'Wedding Arrangements', 'description': 'Special arrangements for weddings'},
    {'name': 'Funeral Arrangements', 'description': 'Respectful funeral flower arrangements'},
    {'name': 'Vases & Accessories', 'description': 'Vases, ribbons, and decorative items'},
    {'name': 'Fillers', 'description': 'Filler flowers like Baby’s Breath'},
]

categories = {}
for cat_data in categories_data:
    cat = Category.objects.create(**cat_data)
    categories[cat.name] = cat

print("Creating suppliers...")
# Create suppliers
suppliers_data = [
    {
        'name': 'Manila Flower Market',
        'contact_person': 'Pedro Reyes',
        'phone': '+639171234570',
        'email': 'pedro@manilaflowers.com',
        'address': '123 Dangwa St, Manila'
    },
    {
        'name': 'Tagaytay Blooms',
        'contact_person': 'Rosa Garcia',
        'phone': '+639171234571',
        'email': 'rosa@tagaitayblooms.com',
        'address': '456 Flower Farm Rd, Tagaytay'
    },
    {
        'name': 'Imported Florals Inc',
        'contact_person': 'David Chen',
        'phone': '+639171234572',
        'email': 'david@importedflorals.com',
        'address': '789 Business Park, Makati'
    },
    {
        'name': 'Garden Supplies Co',
        'contact_person': 'Lisa Tan',
        'phone': '+639171234573',
        'email': 'lisa@gardensupplies.com',
        'address': '321 Supplies Ave, Quezon City'
    },
]

suppliers = {}
for sup_data in suppliers_data:
    sup = Supplier.objects.create(**sup_data)
    suppliers[sup.name] = sup

print("Creating products...")
# Create products
products_data = [
    # ROSES
    {'sku': 'RSE-001', 'name': 'Red Roses Bouquet', 'category': 'Roses', 'supplier': 'Manila Flower Market',
     'unit_price': Decimal('899.00'), 'cost_price': Decimal('600.00'), 'current_stock': 100, 'reorder_level': 20},
    
    # SUNFLOWERS
    {'sku': 'SUN-001', 'name': 'Sunflowers', 'category': 'Sunflowers', 'supplier': 'Tagaytay Blooms',
     'unit_price': Decimal('150.00'), 'cost_price': Decimal('80.00'), 'current_stock': 150, 'reorder_level': 30},
     
    # TULIPS
    {'sku': 'TLP-001', 'name': 'Tulip Bundle', 'category': 'Tulips', 'supplier': 'Imported Florals Inc',
     'unit_price': Decimal('399.00'), 'cost_price': Decimal('250.00'), 'current_stock': 80, 'reorder_level': 15},
     
    # MIXED
    {'sku': 'MXB-001', 'name': 'Mixed Bouquet', 'category': 'Mixed Bouquets', 'supplier': 'Manila Flower Market',
     'unit_price': Decimal('699.00'), 'cost_price': Decimal('450.00'), 'current_stock': 60, 'reorder_level': 10},
     
    # ORCHIDS
    {'sku': 'ORC-001', 'name': 'Orchid Stem', 'category': 'Orchids', 'supplier': 'Tagaytay Blooms',
     'unit_price': Decimal('250.00'), 'cost_price': Decimal('150.00'), 'current_stock': 40, 'reorder_level': 8},
     
    # FILLERS
    {'sku': 'FIL-001', 'name': 'Baby’s Breath', 'category': 'Fillers', 'supplier': 'Manila Flower Market',
     'unit_price': Decimal('120.00'), 'cost_price': Decimal('50.00'), 'current_stock': 200, 'reorder_level': 50},
]

products = {}
for prod_data in products_data:
    cat_name = prod_data.pop('category')
    sup_name = prod_data.pop('supplier')
    prod_data['category'] = categories[cat_name]
    prod_data['supplier'] = suppliers[sup_name]
    prod_data['created_by'] = owner
    prod_data['description'] = f"High quality {prod_data['name'].lower()}"
    
    prod = Product.objects.create(**prod_data)
    products[prod.sku] = prod

print("Creating low stock alerts...")
# Create low stock alerts for products below reorder level
for product in Product.objects.all():
    if product.is_low_stock:
        LowStockAlert.objects.create(
            product=product,
            current_stock=product.current_stock,
            reorder_level=product.reorder_level,
            status='PENDING'
        )

print("Creating sales transactions...")
# Create sales transactions for the past 30 days
print("Importing sales from CSV...")
csv_file_path = os.path.join(os.path.dirname(__file__), 'seed_data_90_days.csv')

transaction_count = 0
transaction_dates = set()
try:
    print("Reading CSV and importing transactions (Atomic)...")
    with transaction.atomic(), open(csv_file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Group rows by date to potentially create multi-item transactions if we wanted, 
        # but for now let's create one transaction per row to reflect the data structure 
        # or maybe we can group all items from the same day into a few transactions to look more natural?
        # The CSV seems to be "Product X sold Y amount on Date Z".
        # To make it realistic, we should probably spread this out.
        # But to be accurate to the data, let's just ensure the totals match.
        # We will create ONE transaction per row.
        
        for row in reader:
            date_str = row['date']
            product_name = row['product']
            quantity = int(row['quantity_sold'])
            price = Decimal(row['price'])
            
            # Parse date
            trans_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            transaction_dates.add(trans_date)
            # Add random time between 8 AM and 6 PM
            trans_datetime = datetime.combine(trans_date, datetime.min.time()) + timedelta(hours=random.randint(8, 17), minutes=random.randint(0, 59))
            trans_datetime = timezone.make_aware(trans_datetime)
            
            # Find product
            try:
                product = Product.objects.get(name=product_name)
            except Product.DoesNotExist:
                print(f"Warning: Product '{product_name}' not found. Skipping.")
                continue
                
            # Random staff
            staff = random.choice([owner, staff1, staff2])
            
            # Calculate totals
            line_total = price * quantity
            
            # Create transaction
            transaction = SalesTransaction.objects.create(
                subtotal=line_total,
                tax=Decimal('0.00'), # Assuming price includes tax or no tax for simplicity as per dataset
                discount=Decimal('0.00'),
                total_amount=line_total,
                payment_method=random.choice(['CASH', 'CARD', 'GCASH', 'PAYMAYA']),
                amount_paid=line_total,
                change_amount=Decimal('0.00'),
                status='COMPLETED',
                created_by=staff,
                created_at=trans_datetime,
                completed_at=trans_datetime
            )
            
            # Manually set created_at because auto_now_add might override it?
            # actually auto_now_add=True in model usually prevents setting it.
            # We might need to update it after creation if the model has auto_now_add=True.
            # Let's check model definition if possible, or just update it.
            SalesTransaction.objects.filter(id=transaction.id).update(created_at=trans_datetime, completed_at=trans_datetime)
            
            TransactionItem.objects.create(
                transaction=transaction,
                product=product,
                quantity=quantity,
                unit_price=price,
                discount=Decimal('0.00')
            )
            
            transaction_count += 1
            
            if transaction_count % 100 == 0:
                print(f"Processed {transaction_count} transactions...")

except FileNotFoundError:
    print(f"Error: Could not find {csv_file_path}")
except Exception as e:
    print(f"Error reading CSV: {e}")

print(f"Created {transaction_count} sales transactions from CSV")

print("Creating seasonal patterns...")
# Create seasonal patterns
seasonal_patterns = [
    {
        'name': "Valentine's Day",
        'season_type': 'HOLIDAY',
        'start_month': 2, 'start_day': 10,
        'end_month': 2, 'end_day': 14,
        'demand_multiplier': 3.5,
        'description': 'Peak season for roses and romantic arrangements',
        'categories': ['Roses', 'Mixed Bouquets']
    },
    {
        'name': "Mother's Day",
        'season_type': 'HOLIDAY',
        'start_month': 5, 'start_day': 8,
        'end_month': 5, 'end_day': 12,
        'demand_multiplier': 2.8,
        'description': 'High demand for all flower types',
        'categories': ['Roses', 'Tulips', 'Lilies', 'Mixed Bouquets']
    },
    {
        'name': 'Wedding Season (June)',
        'season_type': 'MONTHLY',
        'start_month': 6, 'start_day': 1,
        'end_month': 6, 'end_day': 30,
        'demand_multiplier': 2.0,
        'description': 'Peak wedding season',
        'categories': ['Wedding Arrangements', 'Roses', 'Lilies']
    },
    {
        'name': 'Christmas Season',
        'season_type': 'HOLIDAY',
        'start_month': 12, 'start_day': 15,
        'end_month': 12, 'end_day': 25,
        'demand_multiplier': 2.5,
        'description': 'Holiday celebrations and gift giving',
        'categories': ['Mixed Bouquets', 'Wedding Arrangements']
    },
    {
        'name': 'Weekend Surge',
        'season_type': 'WEEKLY',
        'start_month': 1, 'start_day': 1,
        'end_month': 12, 'end_day': 31,
        'demand_multiplier': 1.5,
        'description': 'Increased weekend shopping',
        'categories': []
    },
]

for pattern_data in seasonal_patterns:
    category_names = pattern_data.pop('categories')
    pattern = SeasonalPattern.objects.create(**pattern_data)
    
    for cat_name in category_names:
        if cat_name in categories:
            pattern.categories.add(categories[cat_name])

print("Creating forecast model...")
# Create forecast model
forecast_model = ForecastModel.objects.create(
    name='Linear Regression Model V1',
    model_type='LINEAR_REGRESSION',
    version='1.0.0',
    status='ACTIVE',
    parameters={'window_size': 30, 'confidence_level': 0.95},
    r2_score=0.85,
    mse=150.5,
    rmse=12.27,
    mae=8.5,
    accuracy=85.0,
    training_start_date=date.today() - timedelta(days=90),
    training_end_date=date.today() - timedelta(days=1),
    training_samples=2700,
    is_active=True,
    trained_by=owner
)

print("Creating product forecasts...")
# Create forecasts for next 7 days
for product in Product.objects.all()[:10]:  # Forecast for first 10 products
    base_demand = product.current_stock // 5  # Base daily demand
    
    for days_ahead in range(1, 8):
        forecast_date = date.today() + timedelta(days=days_ahead)
        
        # Add some randomness
        predicted = base_demand + random.randint(-2, 5)
        predicted = max(1, predicted)
        
        ProductForecast.objects.create(
            product=product,
            forecast_model=forecast_model,
            forecast_date=forecast_date,
            predicted_demand=predicted,
            confidence_lower=max(1, predicted - 5),
            confidence_upper=predicted + 8,
            confidence_level=95.0,
            is_peak_season=False,
            seasonal_factor=1.0
        )

print("Creating stock recommendations...")
# Create stock recommendations for low stock items
for product in Product.objects.filter(current_stock__lte=models.F('reorder_level'))[:5]:
    latest_forecast = product.forecasts.filter(
        forecast_date__gte=date.today()
    ).first()
    
    if latest_forecast:
        recommended_qty = latest_forecast.recommended_stock - product.current_stock
        
        if recommended_qty > 0:
            priority = 'URGENT' if product.current_stock < 5 else 'HIGH'
            
            StockRecommendation.objects.create(
                product=product,
                forecast=latest_forecast,
                current_stock=product.current_stock,
                recommended_order_quantity=recommended_qty,
                reason=f'Stock level ({product.current_stock}) below reorder point ({product.reorder_level}). '
                       f'Forecasted demand: {latest_forecast.predicted_demand} units.',
                priority=priority,
                status='PENDING'
            )

print("Creating report schedules...")
# Create report schedules
ReportSchedule.objects.create(
    name='Daily Sales Summary',
    report_type='SALES_DAILY',
    frequency='DAILY',
    recipients='admin@flowershop.com,manager@flowershop.com',
    is_active=True,
    next_run=timezone.now() + timedelta(days=1),
    created_by=owner
)

ReportSchedule.objects.create(
    name='Weekly Sales Report',
    report_type='SALES_WEEKLY',
    frequency='WEEKLY',
    recipients='admin@flowershop.com',
    is_active=True,
    next_run=timezone.now() + timedelta(days=7),
    created_by=owner
)

ReportSchedule.objects.create(
    name='Monthly Inventory Report',
    report_type='INVENTORY_MONTHLY',
    frequency='MONTHLY',
    recipients='admin@flowershop.com,inventory@flowershop.com',
    is_active=True,
    next_run=timezone.now() + timedelta(days=30),
    created_by=owner
)

print("Creating dashboard metrics...")
# Create dashboard metrics for the dates in our dataset
if not transaction_dates:
    print("Warning: No dates found in transaction data. Generating metrics for past 30 days as fallback.")
    for days_ago in range(30, 0, -1):
        transaction_dates.add(date.today() - timedelta(days=days_ago))

for metric_date in sorted(transaction_dates):
    print(f"Generating metrics for {metric_date}...")
    DashboardMetric.generate_for_date(metric_date)

print("Creating audit logs...")
# Create some audit logs
audit_actions = [
    ('LOGIN', 'users', None, 'User logged in'),
    ('CREATE', 'products', None, 'Created new product'),
    ('UPDATE', 'products', None, 'Updated product stock'),
    ('CREATE', 'sales_transactions', None, 'Completed sale'),
]

for user in [owner, staff1, staff2]:
    for _ in range(5):
        action, table, record_id, desc = random.choice(audit_actions)
        AuditLog.objects.create(
            user=user,
            action=action,
            table_name=table,
            record_id=random.randint(1, 100) if record_id is None else record_id,
            description=desc,
            ip_address='127.0.0.1',
            timestamp=timezone.now() - timedelta(days=random.randint(0, 30))
        )

print("\n" + "="*50)
print("SEED DATA GENERATION COMPLETE!")
print("="*50)
print("\nCreated:")
print(f"  - {User.objects.count()} users")
print(f"  - {Category.objects.count()} categories")
print(f"  - {Supplier.objects.count()} suppliers")
print(f"  - {Product.objects.count()} products")
print(f"  - {SalesTransaction.objects.count()} sales transactions")
print(f"  - {TransactionItem.objects.count()} transaction items")
print(f"  - {InventoryMovement.objects.count()} inventory movements")
print(f"  - {LowStockAlert.objects.count()} low stock alerts")
print(f"  - {SeasonalPattern.objects.count()} seasonal patterns")
print(f"  - {ForecastModel.objects.count()} forecast models")
print(f"  - {ProductForecast.objects.count()} product forecasts")
print(f"  - {StockRecommendation.objects.count()} stock recommendations")
print(f"  - {ReportSchedule.objects.count()} report schedules")
print(f"  - {DashboardMetric.objects.count()} dashboard metrics")
print(f"  - {AuditLog.objects.count()} audit log entries")

print("\n" + "="*50)
print("LOGIN CREDENTIALS")
print("="*50)
print("\nOwner/Admin:")
print("  Username: admin")
print("  Password: admin123")
print("\nStaff 1:")
print("  Username: maria")
print("  Password: staff123")
print("\nStaff 2:")
print("  Username: juan")
print("  Password: staff123")
print("\n" + "="*50)