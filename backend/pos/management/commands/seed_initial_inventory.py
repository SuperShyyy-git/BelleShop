import sys
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from inventory.models import Category, Supplier, Product
from accounts.models import User # Assuming the User model is in accounts.models

# Data derived from your sales CSV
INITIAL_PRODUCTS = [
    {'name': 'Red Roses Bouquet', 'sku': 'ROSE001', 'price': '899.00', 'cost': '450.00'},
    {'name': 'Sunflowers', 'sku': 'SUN001', 'price': '150.00', 'cost': '75.00'},
    {'name': 'Tulip Bundle', 'sku': 'TULIP001', 'price': '399.00', 'cost': '200.00'},
    {'name': 'Mixed Bouquet', 'sku': 'MIX001', 'price': '699.00', 'cost': '350.00'},
    {'name': 'Orchid Stem', 'sku': 'ORCHID001', 'price': '250.00', 'cost': '125.00'},
    {'name': 'Baby’s Breath', 'sku': 'BABY001', 'price': '120.00', 'cost': '60.00'},
]

class Command(BaseCommand):
    help = 'Seeds initial Category, Supplier, and Product data if they do not exist.'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        # 1. Get a default user (e.g., the first Superuser)
        try:
            default_user = User.objects.filter(is_superuser=True).first()
            if not default_user:
                self.stdout.write(self.style.ERROR("No superuser found. Please create one first (python manage.py createsuperuser)."))
                sys.exit(1)
        except Exception:
            self.stdout.write(self.style.ERROR("User model not available. Ensure accounts app is migrated."))
            sys.exit(1)

        # 2. Create default Category and Supplier
        category, created_cat = Category.objects.get_or_create(
            name='General Flowers', defaults={'description': 'General flower products for seeding'}
        )
        if created_cat:
            self.stdout.write(self.style.SUCCESS('Created default Category: General Flowers'))

        supplier, created_sup = Supplier.objects.get_or_create(
            name='Default Seed Supplier', defaults={'phone': '09123456789'}
        )
        if created_sup:
            self.stdout.write(self.style.SUCCESS('Created default Supplier: Default Seed Supplier'))

        # 3. Create Products
        products_created = 0
        for item in INITIAL_PRODUCTS:
            product, created_prod = Product.objects.get_or_create(
                name=item['name'],
                defaults={
                    'sku': item['sku'],
                    'category': category,
                    'supplier': supplier,
                    'unit_price': Decimal(item['price']),
                    'cost_price': Decimal(item['cost']),
                    'current_stock': 100, # Start with some stock
                    'reorder_level': 10,
                    'created_by': default_user,
                }
            )
            if created_prod:
                products_created += 1
                self.stdout.write(f"Created Product: {item['name']} (ID: {product.id})")

        if products_created > 0:
            self.stdout.write(self.style.SUCCESS(f"\nSeeding complete. Created {products_created} products."))
        else:
            self.stdout.write(self.style.WARNING("\nInventory already seeded. Skipping product creation."))
            
        self.stdout.write("Ready for the next step: Fetching Product IDs.")