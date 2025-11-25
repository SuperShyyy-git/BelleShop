import csv
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.utils import timezone 
from decimal import Decimal
import sys
import random
import pytz

# --- Import your models ---
from inventory.models import Product 
from pos.models import SalesTransaction, TransactionItem 
try:
    from accounts.models import User
except ImportError:
    User = None


class Command(BaseCommand):
    help = 'Seeds sales data from flowerbelle_sales_dataset.csv into SalesTransaction and TransactionItem models for a 90-day period.'

    # -----------------------------------------------------------
    # IDs confirmed from your live database query output:
    # Note: The CSV file uses different encoding than the database
    PRODUCT_ID_MAP = {
        'Red Roses Bouquet': 3,
        'Sunflowers': 4,
        'Tulip Bundle': 5,
        'Mixed Bouquet': 6,
        'Orchid Stem': 7,
        # Baby's Breath with standard apostrophe
        "Baby's Breath": 8,
        # Database encoding variants
        'Babyâ€™s Breath': 8,
        'BabyÃ†s Breath': 8,
        'BabyÆs Breath': 8,
    }
    # -----------------------------------------------------------
    
    @staticmethod
    def normalize_product_name(name):
        """Normalize product names by replacing all apostrophe variants with standard apostrophe"""
        # Replace all apostrophe variants with standard apostrophe
        apostrophe_variants = [
            '\u2019',  # RIGHT SINGLE QUOTATION MARK
            '\u2018',  # LEFT SINGLE QUOTATION MARK
            '\u02BC',  # MODIFIER LETTER APOSTROPHE
            '\u0027',  # APOSTROPHE (standard)
            'â€™',     # UTF-8 encoding issue
            'Æ',       # Database encoding
            'Ã†',      # Another encoding variant
        ]
        normalized = name
        for variant in apostrophe_variants:
            normalized = normalized.replace(variant, "'")
        return normalized

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE("Starting Sales Transaction data seeding to live database..."))
        
        # 1. Validation and Setup
        try:
            # Get default user for transactions
            default_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
            if not default_user:
                self.stdout.write(self.style.ERROR("\nError: No users found. Cannot create sales transactions."))
                sys.exit(1)
        except Exception:
            self.stdout.write(self.style.ERROR("Error: User model not available. Cannot continue."))
            sys.exit(1)
            
        # UPDATED: Use last 90 days from today instead of fixed dates
        today = datetime.now().date()
        end_date = today
        start_date = end_date - timedelta(days=89)  # 90 days including today
        
        # Original CSV date range
        csv_start_date = datetime(2024, 10, 3).date()
        csv_end_date = datetime(2024, 12, 31).date()
        
        self.stdout.write(self.style.NOTICE(f"🔄 Mapping CSV data from {csv_start_date} to {csv_end_date}"))
        self.stdout.write(self.style.NOTICE(f"📅 To recent dates: {start_date} to {end_date}"))
        
        # 2. Clear ALL existing Sales Transactions
        deleted_count = SalesTransaction.objects.all().count()
        SalesTransaction.objects.all().delete()
        self.stdout.write(self.style.WARNING(f"Cleared {deleted_count} existing sales transactions and related items."))
        
        # 3. Read CSV data and create date mapping
        data_to_load = {}
        csv_file_path = 'flowerbelle_sales_dataset.csv' 

        try:
            with open(csv_file_path, mode='r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                # Debug: Check what product names exist in CSV
                unique_products = set()
                
                for row in reader:
                    sale_date = datetime.strptime(row['date'], '%Y-%m-%d').date()
                    unique_products.add(row['product'])
                    
                    # Only load data from the CSV date range
                    if csv_start_date <= sale_date <= csv_end_date:
                        date_str = row['date']
                        if date_str not in data_to_load:
                            data_to_load[date_str] = []
                        data_to_load[date_str].append(row)
                
                # Show unique products found
                self.stdout.write(self.style.NOTICE(f"\n📦 Products found in CSV:"))
                for prod in sorted(unique_products):
                    normalized = self.normalize_product_name(prod)
                    product_id = self.PRODUCT_ID_MAP.get(normalized)
                    status = "✅" if product_id else "❌"
                    self.stdout.write(self.style.NOTICE(f"   {status} '{prod}' -> '{normalized}' (ID: {product_id})"))
                        
            self.stdout.write(self.style.NOTICE(f"\nLoaded {len(data_to_load)} days of data from CSV"))
            if not data_to_load:
                 self.stdout.write(self.style.ERROR("No data found in the CSV."))
                 return
            
            # Create date mapping: CSV date -> Recent date
            csv_dates = sorted(data_to_load.keys())
            date_mapping = {}
            for i, csv_date_str in enumerate(csv_dates):
                # Map each CSV date to a recent date
                recent_date = start_date + timedelta(days=i)
                date_mapping[csv_date_str] = recent_date
                
            self.stdout.write(self.style.NOTICE(f"📅 Date mapping created: {len(date_mapping)} days"))

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"Error: {csv_file_path} not found. Ensure it is in the backend directory."))
            return
        
        # 4. Process grouped data
        transaction_count = 0
        item_count = 0
        
        # Get the actual database table name from the model
        table_name = SalesTransaction._meta.db_table
        self.stdout.write(self.style.NOTICE(f"Using table: {table_name}"))
        
        with transaction.atomic():
            # Sort the keys to ensure chronological creation
            for csv_date_str in sorted(data_to_load.keys()):
                daily_items = data_to_load[csv_date_str]
                
                # Get the mapped recent date
                mapped_date = date_mapping[csv_date_str]
                
                subtotal = sum(Decimal(item['total_sales']) for item in daily_items)
                total_amount = subtotal
                
                # Create timezone-aware datetime using the MAPPED recent date
                naive_datetime = datetime.combine(mapped_date, datetime.min.time())
                # Add random hour between 9 AM and 6 PM for more realistic data
                naive_datetime = naive_datetime.replace(
                    hour=random.randint(9, 18),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )
                
                # Convert to timezone-aware datetime in UTC
                utc = pytz.UTC
                sale_datetime = utc.localize(naive_datetime)

                # Create the main SalesTransaction using save() to control timestamps
                sales_txn = SalesTransaction(
                    subtotal=subtotal,
                    tax=Decimal('0.00'),
                    discount=Decimal('0.00'),
                    total_amount=total_amount,
                    payment_method='CARD', 
                    payment_reference=f'SEED-{mapped_date}-{random.randint(1000, 9999)}',
                    amount_paid=total_amount,
                    status='COMPLETED',
                    created_by=default_user,
                )
                
                # Save without triggering auto_now_add by directly setting the field
                sales_txn.save()
                
                # Now update the timestamps using raw SQL to bypass Django's auto fields
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"""
                        UPDATE {table_name} 
                        SET created_at = %s, completed_at = %s, updated_at = %s
                        WHERE id = %s
                        """,
                        [sale_datetime, sale_datetime, sale_datetime, sales_txn.id]
                    )
                
                transaction_count += 1
                
                # Create related TransactionItems
                for item in daily_items:
                    product_name = item['product'].strip()
                    # Normalize the product name to handle apostrophe variants
                    normalized_name = self.normalize_product_name(product_name)
                    product_id = self.PRODUCT_ID_MAP.get(normalized_name)
                    
                    if not product_id:
                        self.stdout.write(self.style.ERROR(f"Skipping row: Missing ID for product '{product_name}' (normalized: '{normalized_name}') on {csv_date_str} -> {mapped_date}."))
                        continue
                    
                    try:
                        # Verify product exists
                        Product.objects.get(id=product_id)
                        
                        # Create the TransactionItem
                        TransactionItem.objects.create(
                            transaction=sales_txn,
                            product_id=product_id,
                            quantity=int(item['quantity_sold']),
                            unit_price=Decimal(item['price']),
                            discount=Decimal('0.00'),
                            line_total=Decimal(item['total_sales'])
                        )
                        item_count += 1
                        
                    except Product.DoesNotExist:
                        self.stdout.write(self.style.ERROR(f"Product ID {product_id} not found for '{product_name}'"))
                        continue
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error creating item: {e}"))
                        continue
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ Sales data seeding completed!"))
        self.stdout.write(self.style.SUCCESS(f"   📅 Date range: {start_date} to {end_date}"))
        self.stdout.write(self.style.SUCCESS(f"   📊 Transactions created: {transaction_count}"))
        self.stdout.write(self.style.SUCCESS(f"   🛒 Items created: {item_count}"))
        
        # Verification query
        first_txn = SalesTransaction.objects.order_by('created_at').first()
        last_txn = SalesTransaction.objects.order_by('-created_at').first()
        
        if first_txn and last_txn:
            self.stdout.write(self.style.NOTICE(f"\n🔍 Verification:"))
            self.stdout.write(self.style.NOTICE(f"   First transaction: {first_txn.created_at.date()}"))
            self.stdout.write(self.style.NOTICE(f"   Last transaction: {last_txn.created_at.date()}"))
            
            # Count transactions by date to verify distribution
            from django.db.models import Count
            from django.db.models.functions import TruncDate
            
            date_distribution = SalesTransaction.objects.annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')[:5]
            
            self.stdout.write(self.style.NOTICE(f"\n📊 Sample distribution (first 5 days):"))
            for item in date_distribution:
                self.stdout.write(self.style.NOTICE(f"   {item['date']}: {item['count']} transactions"))