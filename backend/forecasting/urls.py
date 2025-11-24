from django.urls import path
from .views import (
    ForecastDashboardView, 
    GenerateForecastView, 
    ForecastSummaryView
)

urlpatterns = [
    # Dashboard Statistics (Cards at the top)
    path('dashboard-stats/', ForecastDashboardView.as_view(), name='dashboard-stats'),
    
    # Chart Data (Actual historical data)
    path('summary/<int:days>/', ForecastSummaryView.as_view(), name='forecast-summary'),
    
    # Generate Predictions (Button click)
    path('generate/', GenerateForecastView.as_view(), name='generate-forecast'),
]