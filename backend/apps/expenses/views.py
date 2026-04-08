"""
Expenses Views
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import IsOwnerOrCoordinator, IsDriver
from .models import Expense
from .serializers import (
    ExpenseSerializer, ExpenseCreateSerializer,
    ExpenseListSerializer, DriverExpenseSummarySerializer
)


class ExpenseListCreateView(generics.ListCreateAPIView):
    """List all expenses or create new expense"""
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['expense_type', 'driver', 'vehicle']
    permission_classes = [IsOwnerOrCoordinator]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExpenseCreateSerializer
        return ExpenseListSerializer
    
    def get_queryset(self):
        queryset = Expense.objects.select_related('driver__user', 'vehicle')
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(expense_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(expense_date__lte=end_date)
        
        return queryset.order_by('-expense_date')
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calculate summary
        from django.db.models import Sum
        summary = {}
        for expense_type, _ in Expense.EXPENSE_TYPE_CHOICES:
            total = queryset.filter(expense_type=expense_type).aggregate(
                total=Sum('amount')
            )['total'] or 0
            summary[expense_type] = float(total)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': {
                'expenses': serializer.data,
                'summary': {
                    'total_expenses': float(sum(summary.values())),
                    'by_type': summary
                }
            }
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        expense = serializer.save(created_by=request.user)
        
        response_serializer = ExpenseSerializer(expense, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Expense recorded successfully',
            'data': response_serializer.data
        }, status=status.HTTP_201_CREATED)


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete expense"""
    queryset = Expense.objects.select_related('driver__user', 'vehicle')
    serializer_class = ExpenseSerializer
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'


class MyExpensesView(APIView):
    """Get expenses for logged-in driver"""
    permission_classes = [IsDriver]
    
    def get(self, request):
        driver = request.user.driver_profile
        
        # Get query params
        expense_type = request.query_params.get('expense_type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = Expense.objects.filter(driver=driver)
        
        if expense_type:
            queryset = queryset.filter(expense_type=expense_type)
        if start_date:
            queryset = queryset.filter(expense_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(expense_date__lte=end_date)
        
        queryset = queryset.order_by('-expense_date')
        
        serializer = ExpenseSerializer(queryset, many=True, context={'request': request})
        
        # Calculate advance summary
        from django.utils import timezone
        current_month = timezone.now().replace(day=1)
        
        advance_taken = Expense.objects.filter(
            driver=driver,
            expense_type='advance',
            expense_date__month=current_month.month,
            expense_date__year=current_month.year
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        advance_deducted = Expense.objects.filter(
            driver=driver,
            expense_type='advance',
            is_deducted=True,
            expense_date__month=current_month.month,
            expense_date__year=current_month.year
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'success': True,
            'data': {
                'expenses': serializer.data,
                'summary': {
                    'advance_taken': float(advance_taken),
                    'advance_deducted': float(advance_deducted),
                    'remaining_advance': float(advance_taken - advance_deducted)
                }
            }
        })


from django.db.models import Sum
