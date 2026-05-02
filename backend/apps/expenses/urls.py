"""
Expense and FastagRecord URLs — mounted at /api/v1/expenses/
"""
from django.urls import path
from . import views

urlpatterns = [
    # Expense
    path('', views.ExpenseListCreateView.as_view(), name='expense-list-create'),
    path('summary/', views.ExpenseSummaryView.as_view(), name='expense-summary'),
    path('my-expenses/', views.MyExpensesView.as_view(), name='my-expenses'),
    path('<uuid:pk>/', views.ExpenseDetailView.as_view(), name='expense-detail'),

    # FastagRecord
    path('fastag/', views.FastagRecordListCreateView.as_view(), name='fastag-list-create'),
    path('fastag/<uuid:pk>/', views.FastagRecordDetailView.as_view(), name='fastag-detail'),
    path('fastag/<uuid:pk>/refresh-recharge/', views.FastagRefreshView.as_view(), name='fastag-refresh'),
    path('fastag/<uuid:pk>/mark-closed/', views.FastagMarkClosedView.as_view(), name='fastag-mark-closed'),
    path('fastag/<uuid:pk>/reopen/', views.FastagReopenView.as_view(), name='fastag-reopen'),
]
