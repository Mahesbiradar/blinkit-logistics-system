"""
Expenses Views
"""
from django.db.models import Sum
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import IsDriver
from .models import Expense
from .serializers import (
    ExpenseListSerializer,
    ExpenseSerializer,
    ExpenseWriteSerializer,
)


class ExpenseListCreateView(generics.ListCreateAPIView):
    """List all expenses or create new expense"""

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['expense_type', 'driver', 'vehicle']
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExpenseWriteSerializer
        return ExpenseListSerializer

    def get_queryset(self):
        queryset = Expense.objects.select_related('driver__user', 'vehicle', 'trip')

        driver_id = self.request.query_params.get('driver_id')
        vehicle_id = self.request.query_params.get('vehicle_id')
        expense_type = self.request.query_params.get('expense_type')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        is_deducted = self.request.query_params.get('is_deducted')

        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        if expense_type:
            queryset = queryset.filter(expense_type=expense_type)
        if start_date:
            queryset = queryset.filter(expense_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(expense_date__lte=end_date)
        if is_deducted is not None:
            queryset = queryset.filter(is_deducted=is_deducted.lower() == 'true')

        return queryset.order_by('-expense_date', '-created_at')

    def list(self, request, *args, **kwargs):
        if not (request.user.is_owner() or request.user.is_coordinator()):
            raise PermissionDenied("You do not have permission to view all expenses")

        queryset = self.filter_queryset(self.get_queryset())

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
            },
            'meta': {
                'total': queryset.count(),
            },
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

    queryset = Expense.objects.select_related('driver__user', 'vehicle', 'trip')
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ExpenseWriteSerializer
        return ExpenseSerializer

    def _can_access_expense(self, user, expense):
        if user.is_owner() or user.is_coordinator():
            return True
        return user.is_driver_role() and hasattr(user, 'driver_profile') and expense.driver_id == user.driver_profile.id

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._can_access_expense(request.user, instance):
            raise PermissionDenied("You do not have permission to view this expense")

        serializer = self.get_serializer(instance, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not (request.user.is_owner() or request.user.is_coordinator()):
            raise PermissionDenied("You do not have permission to update this expense")

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()

        response_serializer = ExpenseSerializer(expense, context={'request': request})
        return Response({
            'success': True,
            'message': 'Expense updated successfully',
            'data': response_serializer.data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not (request.user.is_owner() or request.user.is_coordinator()):
            raise PermissionDenied("You do not have permission to delete this expense")

        instance.delete()
        return Response({
            'success': True,
            'message': 'Expense deleted successfully',
        }, status=status.HTTP_200_OK)


class MyExpensesView(APIView):
    """Get expenses for logged-in driver"""

    permission_classes = [IsDriver]

    def get(self, request):
        driver = request.user.driver_profile

        expense_type = request.query_params.get('expense_type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = Expense.objects.filter(driver=driver).select_related('driver__user', 'vehicle', 'trip')

        if expense_type:
            queryset = queryset.filter(expense_type=expense_type)
        if start_date:
            queryset = queryset.filter(expense_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(expense_date__lte=end_date)

        queryset = queryset.order_by('-expense_date', '-created_at')
        serializer = ExpenseSerializer(queryset, many=True, context={'request': request})

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
