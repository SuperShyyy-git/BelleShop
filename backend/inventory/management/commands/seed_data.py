import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.contrib.auth import get_user_model
# Importing from 'inventory' app based on your settings.py
from inventory.models import Category, Supplier, Product

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial Categories, Suppliers, and Products'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting data injection...'))

        # 1. Get or Create a Superuser/Admin
        # We try to find the first available user.
        admin_user = User.objects.first()
        if not admin_user:
            self.stdout.write(self.style.WARNING('No users found. Creating a default admin user...'))
            try:
                # Create a default admin if none exists
                admin_user = User.objects.create_superuser('admin', 'admin@flowerbelle.com', 'adminpass123')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating admin (might already exist): {e}'))
                # Try getting the specific admin user if creation failed
                admin_user = User.objects.filter(username='admin').first()

        if not admin_user:
             self.stdout.write(self.style.ERROR('Could not find or create an admin user. Assigning None (this might fail if created_by is required).'))

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

        # 3. Define Data from your CSV
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

            # B. Generate SKU
            sku_base = slugify(prod_name).upper()[:5]
            sku = f"{sku_base}-{random.randint(100, 999)}"

            # C. Calculate Cost Price
            unit_price = Decimal(price)
            cost_price = unit_price * Decimal('0.6')

            # D. Create Product
            try:
                # We use get_or_create checking only the name to prevent duplicates
                product, created = Product.objects.get_or_create(
                    name=prod_name,
                    defaults={
                        "sku": sku,
                        "category": category,
                        "supplier": supplier,
                        "description": f"Beautiful {prod_name} for all occasions.",
                        "unit_price": unit_price,
                        "cost_price": cost_price,
                        "current_stock": 100,
                        "reorder_level": 15,
                        "created_by": admin_user,
                        "is_active": True
                    }
                )
                action = "Created" if created else "Exists"
                self.stdout.write(f"{action}: {product.name}")
            except Exception as e:
                 self.stdout.write(self.style.ERROR(f"Skipping {prod_name}: {e}"))

        self.stdout.write(self.style.SUCCESS('Data injection complete!'))