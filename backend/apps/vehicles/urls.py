"""
Vehicles URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.VehicleListCreateView.as_view(), name='vehicle-list-create'),
    path('<uuid:pk>/', views.VehicleDetailView.as_view(), name='vehicle-detail'),
    path('<uuid:pk>/assign-driver/', views.VehicleAssignDriverView.as_view(), name='vehicle-assign-driver'),
    path('<uuid:pk>/create-driver/', views.VehicleCreateDriverView.as_view(), name='vehicle-create-driver'),
    path('<uuid:pk>/driver-login/', views.VehicleDriverLoginView.as_view(), name='vehicle-driver-login'),
    path('vendors/', views.VendorListCreateView.as_view(), name='vendor-list-create'),
    path('vendors/<uuid:pk>/', views.VendorDetailView.as_view(), name='vendor-detail'),
]
