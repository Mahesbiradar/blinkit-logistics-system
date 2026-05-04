"""
VehicleSettlement URLs — mounted at /api/v1/settlements/
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.VehicleSettlementListCreateView.as_view(), name='settlement-list-create'),
    path('summary/', views.VehicleSettlementSummaryView.as_view(), name='settlement-summary'),
    path('carry-forward/', views.VehicleCarryForwardView.as_view(), name='settlement-carry-forward'),
    path('<uuid:pk>/', views.VehicleSettlementDetailView.as_view(), name='settlement-detail'),
    path('<uuid:pk>/calculate/', views.SettlementCalculateView.as_view(), name='settlement-calculate'),
    path('<uuid:pk>/finalize/', views.SettlementFinalizeView.as_view(), name='settlement-finalize'),
    path('<uuid:pk>/mark-paid/', views.SettlementMarkPaidView.as_view(), name='settlement-mark-paid'),
    path('<uuid:pk>/reopen/', views.SettlementReopenView.as_view(), name='settlement-reopen'),
    path('<uuid:pk>/recalculate-from-trips/', views.SettlementRecalculateFromTripsView.as_view(), name='settlement-recalculate-from-trips'),
]
