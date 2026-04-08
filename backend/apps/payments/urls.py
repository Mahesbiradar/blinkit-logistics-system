"""
Payments URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.PaymentListView.as_view(), name='payment-list'),
    path('calculate/', views.PaymentCalculateView.as_view(), name='payment-calculate'),
    path('<uuid:pk>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('<uuid:pk>/mark-paid/', views.PaymentMarkPaidView.as_view(), name='payment-mark-paid'),
]
