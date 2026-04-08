"""
Dashboard URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('owner/', views.OwnerDashboardView.as_view(), name='owner-dashboard'),
    path('driver/', views.DriverDashboardView.as_view(), name='driver-dashboard'),
    path('daily-summary/', views.DailySummaryView.as_view(), name='daily-summary'),
    path('monthly-report/', views.MonthlyReportView.as_view(), name='monthly-report'),
]
