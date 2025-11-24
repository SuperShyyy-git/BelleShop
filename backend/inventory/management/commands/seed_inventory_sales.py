import csv
import os
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

# Import your actual models
from inventory.models import Product, Category, Supplier
from pos.models import SalesTransaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds Products and SalesTransactions from CSV, shifting dates so data ends TODAY.'

    def handle(self, *args, **kwargs):
        # 1. Locate CSV
        file_path = os.path.join(settings.BASE_DIR, 'flowerbelle_sales_dataset.csv')
        if not os.path.exists(file_path):
             file_path = os.path.join(settings.BASE_DIR, '..', 'flowerbelle_sales_dataset.csv')

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'CSV not found at {file_path}'))
            return

        # 2. Setup Dependencies
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not user:
            try:
                user = User.objects.create_user(username='system_admin', password='password123', email='admin@flowerbelle.com')
            except:
                user = User.objects.first()

        category, _ = Category.objects.get_or_create(name="Imported Flowers", defaults={"description": "Seeded"})
        supplier, _ = Supplier.objects.get_or_create(name="Seed Supplier", defaults={"contact_person": "System"})

        # 3. Identify Line Item Model & Fields
        try:
            SalesItemModel = SalesTransaction.items.rel.related_model
        except AttributeError:
            SalesItemModel = SalesTransaction._meta.get_field('items').related_model

        # Get actual field names from the model to avoid guessing errors
        item_field_names = [f.name for f in SalesItemModel._meta.get_fields()]
        self.stdout.write(f"Using Item Model: {SalesItemModel.__name__}")
        self.stdout.write(f"Detected Item Fields: {item_field_names}")

        # 4. Read CSV
        self.stdout.write('Reading CSV...')
        rows = []
        max_date = None
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                rows.append(row)
                try:
                    d = datetime.strptime(row['date'], '%Y-%m-%d').date()
                    if max_date is None or d > max_date:
                        max_date = d
                except ValueError:
                    continue

        if not max_date:
            return

        # 5. Time Shift
        target_date = timezone.now().date()
        shift = target_date - max_date
        self.stdout.write(f"Shifting data forward by {shift.days} days.")

        # Optimization: Cache
        product_cache = {p.name: p for p in Product.objects.all()}
        existing_txn_numbers = set(SalesTransaction.objects.values_list('transaction_number', flat=True))

        count_sales = 0
        
        try:
            with transaction.atomic():
                for i, row in enumerate(rows):
                    # Prepare Data
                    original_date_str = row['date']
                    original_date = datetime.strptime(original_date_str, '%Y-%m-%d').date()
                    new_date = original_date + shift
                    new_datetime = timezone.make_aware(datetime.combine(new_date, datetime.min.time()) + timedelta(hours=12))

                    product_name = row['product'].strip()
                    price_val = Decimal(row['price'])
                    qty = int(row['quantity_sold'])
                    total = Decimal(row['total_sales'])

                    # Get/Create Product
                    if product_name in product_cache:
                        product = product_cache[product_name]
                    else:
                        hash_suffix = hashlib.md5(product_name.encode()).hexdigest()[:6].upper()
                        generated_sku = f"IMP-{hash_suffix}"
                        product = Product.objects.create(
                            name=product_name,
                            sku=generated_sku,
                            category=category,
                            supplier=supplier,
                            unit_price=price_val,
                            cost_price=price_val * Decimal('0.6'),
                            current_stock=500,
                            reorder_level=10,
                            is_active=True,
                            created_by=user
                        )
                        product_cache[product_name] = product

                    # Transaction Header
                    txn_hash = hashlib.md5(f"{original_date_str}-{product_name}-{qty}-{i}".encode()).hexdigest()[:8].upper()
                    txn_number = f"SEED-{txn_hash}"

                    if txn_number in existing_txn_numbers:
                        continue

                    sale = SalesTransaction.objects.create(
                        transaction_number=txn_number,
                        total_amount=total,
                        subtotal=total,
                        tax=Decimal('0.00'),
                        discount=Decimal('0.00'),
                        amount_paid=total,
                        change_amount=Decimal('0.00'),
                        payment_method='CASH',
                        status='COMPLETED',
                        created_by=user
                    )
                    # Update timestamp
                    SalesTransaction.objects.filter(pk=sale.pk).update(created_at=new_datetime)

                    # --- DYNAMIC ITEM CREATION ---
                    # Build the item_data dictionary dynamically based on available fields
                    item_data = {
                        'transaction': sale,
                        'product': product,
                        'quantity': qty
                    }

                    # Determine Price field
                    if 'unit_price' in item_field_names:
                        item_data['unit_price'] = price_val
                    elif 'price' in item_field_names:
                        item_data['price'] = price_val
                    
                    # Determine Total/Subtotal field
                    if 'subtotal' in item_field_names:
                        item_data['subtotal'] = total
                    elif 'total' in item_field_names:
                        item_data['total'] = total
                    elif 'total_price' in item_field_names:
                        item_data['total_price'] = total
                    elif 'amount' in item_field_names:
                        item_data['amount'] = total

                    try:
                        SalesItemModel.objects.create(**item_data)
                    except Exception as e:
                        print(f"Item creation failed for {txn_number}: {e}")
                        # Continue to next row instead of crashing

                    existing_txn_numbers.add(txn_number)
                    count_sales += 1
                    
                    if count_sales % 25 == 0:
                        self.stdout.write(f"Processed {count_sales} records...")
        
            self.stdout.write(self.style.SUCCESS(f'✅ Success! Created {count_sales} transactions ending on {target_date}.'))
            
        except Exception as e:
            import traceback
            self.stdout.write(self.style.ERROR(f'Script Error: {str(e)}'))
            self.stdout.write(self.style.ERROR(traceback.format_exc()))