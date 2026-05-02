"""
CompanyExpense URLs — mounted at /api/v1/company-expenses/
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.CompanyExpenseListCreateView.as_view(), name='company-expense-list-create'),
    path('summary/', views.CompanyExpenseSummaryView.as_view(), name='company-expense-summary'),
    path('<uuid:pk>/', views.CompanyExpenseDetailView.as_view(), name='company-expense-detail'),
]
