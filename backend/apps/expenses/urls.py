"""
Expenses URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.ExpenseListCreateView.as_view(), name='expense-list-create'),
    path('<uuid:pk>/', views.ExpenseDetailView.as_view(), name='expense-detail'),
    path('my-expenses/', views.MyExpensesView.as_view(), name='my-expenses'),
]
