"""
Drivers URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.DriverListCreateView.as_view(), name='driver-list-create'),
    path('<uuid:pk>/', views.DriverDetailView.as_view(), name='driver-detail'),
    path('<uuid:pk>/stats/', views.DriverStatsView.as_view(), name='driver-stats'),
]
