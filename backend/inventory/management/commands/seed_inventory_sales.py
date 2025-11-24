import csv
import random
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.contrib.auth import get_user_model
# Replace 'products' with the actual name of your app containing models.py
from products.models import Category, Supplier, Product

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial Categories, Suppliers, and Products from CSV data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting data injection...'))

        # 1. Get or Create a Superuser/Admin to assign as creator
        # We try to find the first available user, or create a dummy one if none exist.
        admin_user = User.objects.first()
        if not admin_user:
            self.stdout.write(self.style.WARNING('No users found. Creating a default admin user...'))
            admin_user = User.objects.create_superuser('admin', 'admin@flowerbelle.com', 'adminpass123')

        # 2. Create a Default Supplier
        supplier, created = Supplier.objects.get_or_create(
            name="Flowerbelle Imports",
            defaults={
                "contact_person": "Maria Santos",
                "phone": "+63 900 000 0000",
                "email": "supply@flowerbelle.com",
                "address": "Manila, Philippines"
            }
        )
        if created:
            self.stdout.write(f"Created Supplier: {supplier.name}")

        # 3. Define Data from your CSV (Unique Products)
        # I have extracted the unique items and prices from your CSV file.
        # Format: (Product Name, Category Name, Selling Price)
        csv_data = [
            ("Red Roses Bouquet", "Roses", 899),
            ("Sunflowers", "Sunflowers", 150),
            ("Tulip Bundle", "Tulips", 399),
            ("Mixed Bouquet", "Arrangements", 699),
            ("Orchid Stem", "Orchids", 250),
            ("Baby’s Breath", "Fillers", 120),
        ]

        # 4. Iterate and Inject
        for prod_name, cat_name, price in csv_data:
            # A. Create Category
            category, _ = Category.objects.get_or_create(
                name=cat_name,
                defaults={"description": f"Fresh {cat_name}"}
            )

            # B. Generate SKU (Simple logic: SLUG-001)
            sku_base = slugify(prod_name).upper()[:5]
            sku = f"{sku_base}-{random.randint(100, 999)}"

            # C. Calculate Cost Price (Assuming 60% of selling price for margin)
            unit_price = Decimal(price)
            cost_price = unit_price * Decimal('0.6')

            # D. Create Product
            # We use update_or_create so we don't duplicate if you run this twice
            product, created = Product.objects.update_or_create(
                name=prod_name,
                defaults={
                    "sku": sku, # Note: If SKU exists this might error, but name lookup protects us here
                    "category": category,
                    "supplier": supplier,
                    "description": f"Beautiful {prod_name} for all occasions.",
                    "unit_price": unit_price,
                    "cost_price": cost_price,
                    "current_stock": 100, # Initial seed stock
                    "reorder_level": 15,
                    "created_by": admin_user,
                    "is_active": True
                }
            )
            
            action = "Created" if created else "Updated"
            self.stdout.write(f"{action} Product: {product.name} (Price: {product.unit_price})")

        self.stdout.write(self.style.SUCCESS('Data injection complete!'))