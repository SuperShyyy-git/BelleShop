from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer
from django.db.models import Sum, Count, F, Q, Avg
from django.utils import timezone
from django.http import HttpResponse, Http404
from django.views import View
from datetime import timedelta, datetime, time
from io import BytesIO, StringIO
from django.shortcuts import get_object_or_404
import csv

from django.db.models.functions import ExtractDay, ExtractHour, TruncDate

# ReportLab Imports
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

# App Imports
from accounts.permissions import IsOwner
from pos.models import SalesTransaction, TransactionItem
from inventory.models import Product, Category, InventoryMovement, LowStockAlert
from .models import DashboardMetric, ReportSchedule, ReportExport
from .serializers import (
    DashboardOverviewSerializer, DashboardMetricSerializer,
    SalesAnalyticsSerializer, InventoryAnalyticsSerializer,
    ProfitLossSerializer, StaffPerformanceSerializer,
    ReportScheduleSerializer, ReportExportSerializer, ExportRequestSerializer
)
from accounts.models import User


class BinaryFileRenderer(BaseRenderer):
    media_type = '*/*'
    format = None
    charset = None
    render_style = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class SuperSimpleTestView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        print("=" * 80)
        print("SUPER SIMPLE VIEW CALLED!")
        print("=" * 80)
        return HttpResponse("IT WORKS!", content_type="text/plain")


class TestExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return HttpResponse("Export endpoint is working!", content_type="text/plain")


class SimpleProductStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ('id', 'name', 'current_stock')


PROFIT_AGGREGATION = Sum(F('items__quantity') * (F('items__unit_price') - F('items__product__cost_price')))


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Get current time in Local Timezone (Asia/Manila)
        now = timezone.localtime(timezone.now())
        
        # 2. Define strict start times (12:00:00 AM) for Today, Week, and Month
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = start_of_day - timedelta(days=now.weekday()) # Monday of this week
        start_of_month = start_of_day.replace(day=1) # 1st of this month

        valid_statuses = ['COMPLETED', 'PAID', 'PENDING', 'Completed', 'Paid']
        base_filter = SalesTransaction.objects.filter(status__in=valid_statuses)
        
        # 3. Use __gte (Greater Than or Equal) on the timestamp
        today_txns = base_filter.filter(created_at__gte=start_of_day)
        week_txns = base_filter.filter(created_at__gte=start_of_week)
        month_txns = base_filter.filter(created_at__gte=start_of_month)

        def get_metrics(txns):
            metrics = txns.aggregate(
                sales=Sum('total_amount'), 
                transactions=Count('id'), 
                profit_sum=PROFIT_AGGREGATION
            )
            return {
                'sales': metrics['sales'] or 0, 
                'transactions': metrics['transactions'] or 0, 
                'profit': metrics['profit_sum'] or 0
            }

        today_data = get_metrics(today_txns)
        week_data = get_metrics(week_txns)
        month_data = get_metrics(month_txns)
        
        total_products = Product.objects.filter(is_active=True).count()
        low_stock_count = Product.objects.filter(current_stock__lt=10, is_active=True).count()
        out_of_stock_count = Product.objects.filter(current_stock=0, is_active=True).count()
        inventory_value = Product.objects.filter(is_active=True).aggregate(
            total=Sum(F('current_stock') * F('cost_price'))
        )['total'] or 0
        
        # Top products logic (based on month transactions)
        top_products = TransactionItem.objects.filter(
            transaction__in=month_txns
        ).values(
            'product__id', 'product__name', 'product__sku'
        ).annotate(
            total_quantity=Sum('quantity'), 
            total_sales=Sum('line_total')
        ).order_by('-total_quantity')[:5]
        
        recent_txns = base_filter.order_by('-created_at')[:10].values(
            'id', 'transaction_number', 'total_amount', 'created_at', 'created_by__full_name'
        )
        
        data = {
            'today_sales': float(today_data['sales']), 
            'today_transactions': today_data['transactions'],
            'today_profit': float(today_data['profit']),
            'today_items_sold': TransactionItem.objects.filter(
                transaction__in=today_txns
            ).aggregate(total=Sum('quantity'))['total'] or 0,
            'week_sales': float(week_data['sales']), 
            'week_transactions': week_data['transactions'], 
            'week_profit': float(week_data['profit']),
            'month_sales': float(month_data['sales']), 
            'month_transactions': month_data['transactions'], 
            'month_profit': float(month_data['profit']),
            'total_products': total_products, 
            'low_stock_count': low_stock_count, 
            'out_of_stock_count': out_of_stock_count,
            'inventory_value': float(inventory_value), 
            'pending_alerts': LowStockAlert.objects.filter(status='PENDING').count(),
            'top_products': list(top_products), 
            'recent_transactions': list(recent_txns)
        }
        
        return Response(DashboardOverviewSerializer(data).data)


class DashboardMetricsHistoryView(generics.ListAPIView):
    serializer_class = DashboardMetricSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        return DashboardMetric.objects.filter(date__gte=start_date)


class SalesAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'month')
        now = timezone.localtime(timezone.now())
        today = now.date()
        
        # Day names for weekly display
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        # Determine date range based on period
        if period == 'day':
            start_date = today
            end_date = today
            grouping = 'hourly'
        elif period == 'week':
            # Get Monday of this week
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)  # Sunday
            grouping = 'daily'
        elif period == 'month':
            start_date = today.replace(day=1)
            # End of month
            next_month = today.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
            grouping = 'daily'
        elif period == 'year':
            start_date = today.replace(month=1, day=1)
            end_date = today.replace(month=12, day=31)
            grouping = 'monthly'
        elif period == 'all':
            # Get earliest transaction date
            earliest = SalesTransaction.objects.filter(
                status__in=['COMPLETED', 'PAID', 'Completed', 'Paid']
            ).order_by('created_at').first()
            start_date = earliest.created_at.date() if earliest else today.replace(month=1, day=1)
            end_date = today
            grouping = 'yearly'
        else:
            start_date = today.replace(day=1)
            end_date = today
            grouping = 'daily'
        
        # Query transactions
        all_txns = SalesTransaction.objects.filter(
            status__in=['COMPLETED', 'PAID', 'PENDING', 'Completed', 'Paid'],
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).order_by('created_at')
        
        total_sales = 0.0
        total_transactions = 0
        
        # Group data based on period
        if grouping == 'hourly':
            # Daily view: group by hour
            hourly_data = {i: {'total': 0.0, 'count': 0} for i in range(24)}
            for txn in all_txns:
                hour = timezone.localtime(txn.created_at).hour
                amount = float(txn.total_amount)
                total_sales += amount
                total_transactions += 1
                hourly_data[hour]['total'] += amount
                hourly_data[hour]['count'] += 1
            
            daily_trend = [
                {'day': f'{h:02d}:00', 'label': f'{h:02d}:00', 'total': hourly_data[h]['total'], 'count': hourly_data[h]['count']}
                for h in range(24)
            ]
        
        elif grouping == 'daily' and period == 'week':
            # Weekly view: group by day of week (Mon-Sun)
            weekly_data = {i: {'total': 0.0, 'count': 0} for i in range(7)}
            for txn in all_txns:
                local_dt = timezone.localtime(txn.created_at)
                day_of_week = local_dt.weekday()  # 0=Monday, 6=Sunday
                amount = float(txn.total_amount)
                total_sales += amount
                total_transactions += 1
                weekly_data[day_of_week]['total'] += amount
                weekly_data[day_of_week]['count'] += 1
            
            daily_trend = [
                {
                    'day': (start_date + timedelta(days=i)).strftime('%Y-%m-%d'),
                    'label': day_names[i],
                    'total': weekly_data[i]['total'],
                    'count': weekly_data[i]['count']
                }
                for i in range(7)
            ]
        
        elif grouping == 'daily':
            # Monthly view: daily breakdown
            sales_by_date = {}
            for txn in all_txns:
                local_date = timezone.localtime(txn.created_at).strftime('%Y-%m-%d')
                amount = float(txn.total_amount)
                total_sales += amount
                total_transactions += 1
                if local_date in sales_by_date:
                    sales_by_date[local_date]['total'] += amount
                    sales_by_date[local_date]['count'] += 1
                else:
                    sales_by_date[local_date] = {'total': amount, 'count': 1}
            
            daily_trend = []
            current = start_date
            while current <= min(end_date, today):
                date_str = current.strftime('%Y-%m-%d')
                day_num = current.day
                data = sales_by_date.get(date_str, {'total': 0.0, 'count': 0})
                daily_trend.append({
                    'day': date_str,
                    'label': str(day_num),
                    'total': data['total'],
                    'count': data['count']
                })
                current += timedelta(days=1)
        
        elif grouping == 'monthly':
            # Yearly view: monthly breakdown
            monthly_data = {i: {'total': 0.0, 'count': 0} for i in range(1, 13)}
            for txn in all_txns:
                local_dt = timezone.localtime(txn.created_at)
                month = local_dt.month
                amount = float(txn.total_amount)
                total_sales += amount
                total_transactions += 1
                monthly_data[month]['total'] += amount
                monthly_data[month]['count'] += 1
            
            daily_trend = [
                {
                    'day': f'{start_date.year}-{m:02d}-01',
                    'label': month_names[m-1],
                    'total': monthly_data[m]['total'],
                    'count': monthly_data[m]['count']
                }
                for m in range(1, 13)
            ]
        
        elif grouping == 'yearly':
            # All Time view: yearly breakdown
            yearly_data = {}
            for txn in all_txns:
                local_dt = timezone.localtime(txn.created_at)
                year = local_dt.year
                amount = float(txn.total_amount)
                total_sales += amount
                total_transactions += 1
                if year in yearly_data:
                    yearly_data[year]['total'] += amount
                    yearly_data[year]['count'] += 1
                else:
                    yearly_data[year] = {'total': amount, 'count': 1}
            
            # Get range of years
            if yearly_data:
                min_year = min(yearly_data.keys())
                max_year = max(yearly_data.keys())
                daily_trend = [
                    {
                        'day': f'{y}-01-01',
                        'label': str(y),
                        'total': yearly_data.get(y, {'total': 0.0, 'count': 0})['total'],
                        'count': yearly_data.get(y, {'total': 0.0, 'count': 0})['count']
                    }
                    for y in range(min_year, max_year + 1)
                ]
            else:
                daily_trend = []
        else:
            daily_trend = []
        
        # Get recent transactions
        recent_transactions_list = SalesTransaction.objects.all().order_by('-created_at')[:50].values(
            'id', 'transaction_number', 'created_at', 'total_amount', 'status', 'payment_method'
        )
        
        data = {
            'period': period,
            'grouping': grouping,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_sales': total_sales,
            'total_transactions': total_transactions,
            'average_transaction': total_sales / total_transactions if total_transactions > 0 else 0,
            'daily_trend': daily_trend,
            'transactions': list(recent_transactions_list)
        }
        return Response(data)



class InventoryAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()
        total_inventory_value = Product.objects.filter(is_active=True).aggregate(total=Sum(F('current_stock') * F('cost_price')))['total'] or 0
        low_stock_count = Product.objects.filter(current_stock__lt=10, is_active=True).count()
        out_of_stock_count = Product.objects.filter(current_stock=0, is_active=True).count()
        expired_products = Product.objects.filter(expiry_date__lt=timezone.now().date(), is_active=True).count()
        average_stock_age = Product.objects.filter(is_active=True).annotate(age=ExtractDay(timezone.now() - F('created_at'))).aggregate(avg=Avg('age'))['avg'] or 0
        last_30_days = timezone.now() - timedelta(days=30)
        fast_moving = TransactionItem.objects.filter(transaction__status__in=['COMPLETED', 'PAID', 'Completed'], transaction__created_at__gte=last_30_days).values('product__id', 'product__name', 'product__current_stock').annotate(total_sold=Sum('quantity')).order_by('-total_sold')[:10]
        slow_moving = Product.objects.filter(is_active=True).annotate(sold=Sum('transaction_items__quantity', filter=Q(transaction_items__transaction__status__in=['COMPLETED', 'PAID', 'Completed'], transaction_items__transaction__created_at__gte=last_30_days))).filter(Q(sold__isnull=True) | Q(sold__lte=5)).values('id', 'name', 'current_stock', 'sold')[:10]
        category_distribution = Product.objects.filter(is_active=True).values('category__name').annotate(product_count=Count('id'), total_stock=Sum('current_stock'), total_value=Sum(F('current_stock') * F('cost_price'))).order_by('-total_value')
        stock_in_total = InventoryMovement.objects.filter(movement_type='STOCK_IN', created_at__gte=last_30_days).aggregate(total=Sum('quantity'))['total'] or 0
        stock_out_total = InventoryMovement.objects.filter(movement_type__in=['STOCK_OUT', 'SALE'], created_at__gte=last_30_days).aggregate(total=Sum('quantity'))['total'] or 0
        adjustments_total = InventoryMovement.objects.filter(movement_type='ADJUSTMENT', created_at__gte=last_30_days).count()
        data = {'total_products': total_products, 'active_products': active_products, 'total_inventory_value': float(total_inventory_value), 'low_stock_count': low_stock_count, 'out_of_stock_count': out_of_stock_count, 'expired_products': expired_products, 'average_stock_age': int(average_stock_age) if average_stock_age else 0, 'fast_moving_products': list(fast_moving), 'slow_moving_products': list(slow_moving), 'category_distribution': list(category_distribution), 'stock_in_total': stock_in_total, 'stock_out_total': stock_out_total, 'adjustments_total': adjustments_total}
        return Response(InventoryAnalyticsSerializer(data).data)


class SimpleInventoryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SimpleProductStockSerializer

    def get_queryset(self):
        return Product.objects.filter(is_active=True, current_stock__gt=0).order_by('-current_stock')[:15]


class ProfitLossReportView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        period = request.query_params.get('period', 'month')
        today = timezone.localtime(timezone.now()).date()
        if period == 'month':
            start_date = today.replace(day=1)
            end_date = today
        elif period == 'year':
            start_date = today.replace(month=1, day=1)
            end_date = today
        else:
            try:
                start_date = datetime.fromisoformat(request.query_params.get('start_date')).date()
                end_date = datetime.fromisoformat(request.query_params.get('end_date')).date()
            except:
                start_date = today.replace(day=1)
                end_date = today
        filter_end_date = end_date + timedelta(days=1)
        transactions = SalesTransaction.objects.filter(status__in=['COMPLETED', 'PAID', 'Completed'], created_at__date__gte=start_date, created_at__date__lt=filter_end_date)
        gross_sales = transactions.aggregate(total=Sum('subtotal'))['total'] or 0
        discounts = transactions.aggregate(total=Sum('discount'))['total'] or 0
        net_sales = transactions.aggregate(total=Sum('total_amount'))['total'] or 0
        cost_of_goods_sold = sum(item.product.cost_price * item.quantity for t in transactions for item in t.items.all())
        gross_profit = net_sales - cost_of_goods_sold
        gross_profit_margin = (gross_profit / net_sales * 100) if net_sales > 0 else 0
        operating_expenses = 0
        net_profit = gross_profit - operating_expenses
        net_profit_margin = (net_profit / net_sales * 100) if net_sales > 0 else 0
        profit_by_category = []
        for category in Category.objects.filter(is_active=True):
            cat_items = TransactionItem.objects.filter(transaction__in=transactions, product__category=category)
            cat_revenue = cat_items.aggregate(total=Sum('line_total'))['total'] or 0
            cat_cost = sum(item.product.cost_price * item.quantity for item in cat_items)
            cat_profit = cat_revenue - cat_cost
            if cat_revenue > 0:
                profit_by_category.append({'category': category.name, 'revenue': float(cat_revenue), 'cost': float(cat_cost), 'profit': float(cat_profit), 'margin': float((cat_profit / cat_revenue * 100))})
        profit_by_category.sort(key=lambda x: x['profit'], reverse=True)
        profit_by_product = []
        product_items = TransactionItem.objects.filter(transaction__in=transactions).values('product__id', 'product__name', 'product__cost_price').annotate(revenue=Sum('line_total'), quantity=Sum('quantity'))
        for item in product_items:
            cost = item['product__cost_price'] * item['quantity']
            profit = item['revenue'] - cost
            profit_by_product.append({'product': item['product__name'], 'revenue': float(item['revenue']), 'cost': float(cost), 'profit': float(profit), 'quantity': item['quantity']})
        profit_by_product.sort(key=lambda x: x['profit'], reverse=True)
        profit_by_product = profit_by_product[:15]
        data = {'period': period, 'start_date': start_date, 'end_date': end_date, 'gross_sales': float(gross_sales), 'discounts': float(discounts), 'net_sales': float(net_sales), 'cost_of_goods_sold': float(cost_of_goods_sold), 'gross_profit': float(gross_profit), 'gross_profit_margin': float(gross_profit_margin), 'operating_expenses': float(operating_expenses), 'net_profit': float(net_profit), 'net_profit_margin': float(net_profit_margin), 'profit_by_category': profit_by_category, 'profit_by_product': profit_by_product}
        return Response(ProfitLossSerializer(data).data)


class StaffPerformanceView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        today = timezone.localtime(timezone.now()).date()
        if not start_date_param or not end_date_param:
            start_date = today.replace(day=1)
            end_date = today
        else:
            try:
                start_date = datetime.fromisoformat(start_date_param).date()
                end_date = datetime.fromisoformat(end_date_param).date()
            except:
                start_date = today.replace(day=1)
                end_date = today
        filter_end_date = end_date + timedelta(days=1)
        staff_users = User.objects.filter(role='STAFF', is_active=True)
        performance_data = []
        for user in staff_users:
            transactions = SalesTransaction.objects.filter(status__in=['COMPLETED', 'PAID', 'Completed'], created_by=user, created_at__date__gte=start_date, created_at__date__lt=filter_end_date)
            total_sales = transactions.aggregate(total=Sum('total_amount'))['total'] or 0
            total_transactions = transactions.count()
            total_items = TransactionItem.objects.filter(transaction__in=transactions).aggregate(total=Sum('quantity'))['total'] or 0
            average_transaction = total_sales / total_transactions if total_transactions > 0 else 0
            days_worked = (end_date - start_date).days + 1
            transactions_per_day = total_transactions / days_worked if days_worked > 0 else 0
            best_day = transactions.annotate(day=TruncDate('created_at')).values('day').annotate(total=Sum('total_amount')).order_by('-total').first()
            best_selling_day = best_day['day'] if best_day else start_date
            best_selling_day_amount = best_day['total'] if best_day else 0
            performance_data.append({'staff_id': user.id, 'staff_name': user.full_name, 'total_sales': float(total_sales), 'total_transactions': total_transactions, 'total_items_sold': total_items, 'average_transaction': float(average_transaction), 'transactions_per_day': float(transactions_per_day), 'best_selling_day': best_selling_day, 'best_selling_day_amount': float(best_selling_day_amount)})
        performance_data.sort(key=lambda x: x['total_sales'], reverse=True)
        return Response(StaffPerformanceSerializer(performance_data, many=True).data)


class ReportExportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        export = ReportExport.objects.create(report_type=serializer.validated_data['report_type'], export_format=serializer.validated_data['export_format'], start_date=serializer.validated_data.get('start_date'), end_date=serializer.validated_data.get('end_date'), filters=serializer.validated_data.get('filters'), created_by=request.user, status='PENDING')
        export.status = 'COMPLETED'
        export.completed_at = timezone.now()
        export.file_path = f'/exports/{export.report_type}_{export.id}.{export.export_format.lower()}'
        export.save()
        return Response({'message': 'Export created successfully', 'export': ReportExportSerializer(export).data}, status=status.HTTP_201_CREATED)


class ReportExportListView(generics.ListAPIView):
    serializer_class = ReportExportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReportExport.objects.filter(created_by=self.request.user).order_by('-created_at')


class SimpleReportExport(View):
    """Simple function-based export with product details"""
    
    def get(self, request, report_type):
        print("\n" + "="*80)
        print(f"✅ SimpleReportExport CALLED! Report type: {report_type}")
        
        export_format = request.GET.get('format', 'PDF').upper()
        period = request.GET.get('period', 'month')
        specific_date_str = request.GET.get('specific_date')
        selected_days_str = request.GET.get('selected_days', '')  # e.g., "Monday,Friday"
        selected_month = request.GET.get('month')  # e.g., "12"
        selected_year = request.GET.get('year')  # e.g., "2024"
        
        # Parse selected days
        selected_days = []
        if selected_days_str:
            day_map = {
                'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
                'Friday': 4, 'Saturday': 5, 'Sunday': 6
            }
            for day_name in selected_days_str.split(','):
                day_name = day_name.strip()
                if day_name in day_map:
                    selected_days.append(day_map[day_name])
            print(f"📆 Selected Days: {selected_days_str} -> {selected_days}")
        
        # 1. Get "Now" in Local Time
        now = timezone.localtime(timezone.now())
        today = now.date()
        
        # 2. Determine Start and End DATES
        if specific_date_str:
            try:
                # Use specific date
                start_date = datetime.strptime(specific_date_str, '%Y-%m-%d').date()
                end_date = start_date
                print(f"👉 Filtering by Specific Date: {start_date}")
            except ValueError:
                start_date = today
                end_date = today
        else:
            # Use Periods
            if period == 'day':
                # Daily - use specific date or today
                if specific_date_str:
                    try:
                        start_date = datetime.strptime(specific_date_str, '%Y-%m-%d').date()
                        end_date = start_date
                    except ValueError:
                        start_date = today
                        end_date = today
                else:
                    start_date = today
                    end_date = today
            elif period == 'week':
                start_date = today - timedelta(days=today.weekday())
                end_date = start_date + timedelta(days=6)
            elif period == 'month':
                # Monthly - use selected month and year
                if selected_month and selected_year:
                    try:
                        year = int(selected_year)
                        month = int(selected_month)
                        start_date = datetime(year, month, 1).date()
                        # Last day of month
                        if month == 12:
                            end_date = datetime(year, 12, 31).date()
                        else:
                            end_date = (datetime(year, month + 1, 1) - timedelta(days=1)).date()
                        print(f"👉 Selected Month: {month}/{year}")
                    except (ValueError, TypeError):
                        start_date = today.replace(day=1)
                        next_month = today.replace(day=28) + timedelta(days=4)
                        end_date = next_month - timedelta(days=next_month.day)
                else:
                    start_date = today.replace(day=1)
                    next_month = today.replace(day=28) + timedelta(days=4)
                    end_date = next_month - timedelta(days=next_month.day)
            elif period == 'year':
                # Yearly - use selected year
                if selected_year:
                    try:
                        year = int(selected_year)
                        start_date = datetime(year, 1, 1).date()
                        end_date = datetime(year, 12, 31).date()
                        print(f"👉 Selected Year: {year}")
                    except (ValueError, TypeError):
                        start_date = today.replace(month=1, day=1)
                        end_date = today.replace(month=12, day=31)
                else:
                    start_date = today.replace(month=1, day=1)
                    end_date = today.replace(month=12, day=31)
            elif period == 'all':
                # All time: get earliest transaction date
                earliest = SalesTransaction.objects.filter(
                    status__in=['COMPLETED', 'PAID', 'Completed', 'Paid']
                ).order_by('created_at').first()
                if earliest:
                    start_date = earliest.created_at.date()
                else:
                    start_date = today.replace(month=1, day=1)
                end_date = today
                print(f"👉 ALL TIME: {start_date} to {end_date}")
            else:
                start_date = today.replace(day=1)
                end_date = today

        print(f"📅 Date Range: {start_date} to {end_date}")

        # 3. CRITICAL FIX: Convert Dates to Full Timezone-Aware Datetimes
        # This ensures we get everything from 00:00:00 to 23:59:59 in YOUR timezone
        
        # Start of day (00:00:00)
        start_datetime = timezone.make_aware(datetime.combine(start_date, time.min))
        
        # End of day (23:59:59.999999)
        end_datetime = timezone.make_aware(datetime.combine(end_date, time.max))

        # GENERATE OUTPUT - pass selected_days for filtering
        if export_format == 'PDF':
            return self.generate_pdf(report_type, start_date, end_date, start_datetime, end_datetime, selected_days)
        else:
            return self.generate_csv(report_type, start_date, end_date, start_datetime, end_datetime, selected_days)
    
    def generate_pdf(self, report_type, start_date, end_date, start_datetime, end_datetime, selected_days=None):
        print(f"Generating PDF for {report_type}...")
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, 
                               rightMargin=30, leftMargin=30,
                               topMargin=30, bottomMargin=30)
        elements = []
        styles = getSampleStyleSheet()
        
        title = Paragraph(f"<b>{report_type.upper()} REPORT</b>", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        date_label = start_date.strftime('%B %d, %Y')
        if start_date != end_date:
            date_label += f" to {end_date.strftime('%B %d, %Y')}"
        
        # Add day filter info if specific days selected
        if selected_days:
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            selected_day_names = [day_names[d] for d in selected_days if d < len(day_names)]
            date_label += f" ({', '.join(selected_day_names)} only)"
            
        period_text = Paragraph(f"<b>Period:</b> {date_label}", styles['Normal'])
        elements.append(period_text)
        elements.append(Spacer(1, 0.3*inch))
        
        # Pass the DATETIMES and selected_days to the data fetcher
        data = self.get_report_data(report_type, start_datetime, end_datetime, selected_days)
        
        if data and len(data) > 1:
            if report_type.lower() == 'sales':
                col_widths = [1.2*inch, 1.0*inch, 1.2*inch, 2.0*inch, 1.0*inch, 1.0*inch]
            elif report_type.lower() == 'inventory':
                col_widths = [2.5*inch, 1.5*inch, 0.8*inch, 1.0*inch, 1.0*inch]
            else:
                col_widths = None
            
            table = Table(data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8FBC8F')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F5FFF5')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(table)
        else:
            elements.append(Paragraph("<i>No data available for this period.</i>", styles['Italic']))
            
        doc.build(elements)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{report_type}_{start_date}.pdf"'
        return response

    def generate_csv(self, report_type, start_date, end_date, start_datetime, end_datetime, selected_days=None):
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([f"{report_type.upper()} REPORT"])
        writer.writerow([f"Period: {start_date} to {end_date}"])
        writer.writerow([])
        
        # Pass the DATETIMES and selected_days to the data fetcher
        data = self.get_report_data(report_type, start_datetime, end_datetime, selected_days)
        
        for row in data:
            writer.writerow(row)
        csv_content = output.getvalue()
        output.close()
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report_type}_{start_date}.csv"'
        return response

    def get_report_data(self, report_type, start_datetime, end_datetime, selected_days=None):
        """
        Uses Full Datetime (00:00:00 to 23:59:59) for accurate filtering
        Also filters by selected_days (list of weekday numbers: 0=Monday, 6=Sunday)
        """
        report_type_lower = report_type.lower()
        
        if report_type_lower == 'sales':
            # FIX: Use 'created_at__range' with timezone-aware datetimes
            transactions = SalesTransaction.objects.filter(
                created_at__range=(start_datetime, end_datetime),
                status__in=['COMPLETED', 'PAID', 'Completed', 'Paid']
            ).select_related('created_by').prefetch_related('items__product').order_by('-created_at')
            
            # Filter by selected days if provided
            if selected_days:
                filtered_transactions = []
                for trans in transactions:
                    local_dt = timezone.localtime(trans.created_at)
                    if local_dt.weekday() in selected_days:
                        filtered_transactions.append(trans)
                transactions = filtered_transactions
                print(f"📆 Filtered to {len(transactions)} transactions for selected days: {selected_days}")
            
            data = [['Date', 'Transaction #', 'Cashier', 'Products', 'Qty', 'Amount']]
            
            total_sales_sum = 0
            
            for trans in transactions:
                # Convert UTC DB time to Local Time for display
                local_dt = timezone.localtime(trans.created_at)
                
                items = trans.items.all()
                total_sales_sum += trans.total_amount
                
                if items:
                    product_lines = []
                    total_qty = 0
                    for item in items:
                        product_lines.append(f"{item.product.name} (x{item.quantity})")
                        total_qty += item.quantity
                    products_text = "\n".join(product_lines)
                    data.append([
                        local_dt.strftime('%Y-%m-%d\n%H:%M'),
                        trans.transaction_number,
                        trans.created_by.full_name if trans.created_by else 'Unknown',
                        products_text,
                        str(total_qty),
                        f"₱{trans.total_amount:,.2f}"
                    ])
                else:
                    data.append([
                        local_dt.strftime('%Y-%m-%d\n%H:%M'),
                        trans.transaction_number,
                        trans.created_by.full_name if trans.created_by else 'Unknown',
                        'No items',
                        '0',
                        f"₱{trans.total_amount:,.2f}"
                    ])
            
            # Add a Total Row at the bottom
            data.append(['', '', '', 'TOTAL SALES:', '', f"₱{total_sales_sum:,.2f}"])
            
            return data
        
        elif report_type_lower == 'inventory':
            products = Product.objects.filter(is_active=True).select_related('category').order_by('name')[:100]
            data = [['Product Name', 'Category', 'Stock', 'Price', 'Status']]
            for product in products:
                status = 'Low Stock' if product.current_stock < 10 else 'In Stock'
                data.append([
                    product.name,
                    product.category.name if product.category else 'N/A',
                    str(product.current_stock),
                    f"₱{product.unit_price:,.2f}",
                    status
                ])
            return data
            
        elif report_type_lower == 'staff':
            # FIX: Staff performance needs strict ranges too
            staff = User.objects.filter(role='STAFF', is_active=True)
            data = [['Staff Name', 'Transactions', 'Items Sold', 'Total Sales']]
            
            for user in staff:
                trans = SalesTransaction.objects.filter(
                    created_by=user,
                    created_at__range=(start_datetime, end_datetime),
                    status__in=['COMPLETED', 'PAID', 'Completed', 'Paid']
                )
                total = trans.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
                items_sold = TransactionItem.objects.filter(
                    transaction__in=trans
                ).aggregate(Sum('quantity'))['quantity__sum'] or 0
                
                data.append([
                    user.full_name,
                    str(trans.count()),
                    str(items_sold),
                    f"₱{total:,.2f}"
                ])
            return data

        return []


class DebugExportView(APIView):
    permission_classes = []

    def get(self, request):
        print("\n" + "="*80)
        print("DEBUG EXPORT VIEW CALLED!")
        print("="*80 + "\n")
        return HttpResponse("Debug view works!", content_type="text/plain")