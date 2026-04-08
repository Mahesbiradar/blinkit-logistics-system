"""
Trips URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.TripListCreateView.as_view(), name='trip-list-create'),
    path('<uuid:pk>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('<uuid:pk>/approve/', views.TripApproveView.as_view(), name='trip-approve'),
    path('<uuid:pk>/reject/', views.TripRejectView.as_view(), name='trip-reject'),
    path('my-trips/', views.MyTripsView.as_view(), name='my-trips'),
    path('pending/', views.PendingTripsView.as_view(), name='pending-trips'),
    path('stats/', views.TripStatsView.as_view(), name='trip-stats'),
]
