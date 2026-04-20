from django.urls import path
from .views import MonthlyMISReportView, ExpenseReportView, PaymentSummaryReportView

urlpatterns = [
    path('monthly-mis/', MonthlyMISReportView.as_view(), name='report-monthly-mis'),
    path('expenses/', ExpenseReportView.as_view(), name='report-expenses'),
    path('payment-summary/', PaymentSummaryReportView.as_view(), name='report-payment-summary'),
]
