"""
Expenses Views — Expense, FastagRecord, CompanyExpense
"""
from django.db.models import Sum
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwner
from .models import CompanyExpense, Expense, FastagRecord
from .serializers import (
    CompanyExpenseSerializer,
    CompanyExpenseWriteSerializer,
    ExpenseSerializer,
    ExpenseWriteSerializer,
    FastagRecordCreateSerializer,
    FastagRecordPatchSerializer,
    FastagRecordSerializer,
)


# ── Expense ───────────────────────────────────────────────────────────────────

class ExpenseListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return ExpenseWriteSerializer if self.request.method == 'POST' else ExpenseSerializer

    def get_queryset(self):
        qs = Expense.objects.select_related('vehicle', 'created_by').order_by(
            '-expense_date', '-created_at'
        )
        params = self.request.query_params
        if params.get('vehicle_id'):
            qs = qs.filter(vehicle_id=params['vehicle_id'])
        if params.get('month_year'):
            qs = qs.filter(month_year=params['month_year'])
        if params.get('expense_type'):
            qs = qs.filter(expense_type=params['expense_type'])
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = ExpenseSerializer(qs, many=True, context={'request': request})
        return Response({'success': True, 'data': {'expenses': serializer.data, 'total': qs.count()}})

    def create(self, request, *args, **kwargs):
        serializer = ExpenseWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        return Response(
            {'success': True, 'message': 'Expense recorded.', 'data': ExpenseSerializer(expense, context={'request': request}).data},
            status=status.HTTP_201_CREATED,
        )


class ExpenseSummaryView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        qs = Expense.objects.all()
        if request.query_params.get('vehicle_id'):
            qs = qs.filter(vehicle_id=request.query_params['vehicle_id'])
        if request.query_params.get('month_year'):
            qs = qs.filter(month_year=request.query_params['month_year'])

        by_type = {}
        for choice_value, _ in Expense.EXPENSE_TYPE_CHOICES:
            total = qs.filter(expense_type=choice_value).aggregate(t=Sum('amount'))['t'] or 0
            by_type[choice_value] = float(total)

        return Response({
            'success': True,
            'data': {
                'total': float(sum(by_type.values())),
                'by_type': by_type,
            },
        })


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Expense.objects.select_related('vehicle', 'created_by')
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return ExpenseWriteSerializer if self.request.method in ('PUT', 'PATCH') else ExpenseSerializer

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response({'success': True, 'data': ExpenseSerializer(obj, context={'request': request}).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        obj = self.get_object()
        serializer = ExpenseWriteSerializer(obj, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        return Response({'success': True, 'message': 'Expense updated.', 'data': ExpenseSerializer(expense, context={'request': request}).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({'success': True, 'message': 'Expense deleted.'}, status=status.HTTP_200_OK)


# ── FastagRecord ──────────────────────────────────────────────────────────────

class FastagRecordListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return FastagRecordCreateSerializer if self.request.method == 'POST' else FastagRecordSerializer

    def get_queryset(self):
        qs = FastagRecord.objects.select_related('vehicle', 'created_by').order_by('-month_year')
        params = self.request.query_params
        if params.get('vehicle_id'):
            qs = qs.filter(vehicle_id=params['vehicle_id'])
        if params.get('month_year'):
            qs = qs.filter(month_year=params['month_year'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({'success': True, 'data': FastagRecordSerializer(qs, many=True, context={'request': request}).data})

    def create(self, request, *args, **kwargs):
        serializer = FastagRecordCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return Response(
            {'success': True, 'message': 'Fastag record created.', 'data': FastagRecordSerializer(record, context={'request': request}).data},
            status=status.HTTP_201_CREATED,
        )


class FastagRecordDetailView(generics.RetrieveUpdateAPIView):
    queryset = FastagRecord.objects.select_related('vehicle')
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return FastagRecordPatchSerializer if self.request.method == 'PATCH' else FastagRecordSerializer

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response({'success': True, 'data': FastagRecordSerializer(obj, context={'request': request}).data})

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = FastagRecordPatchSerializer(obj, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return Response({'success': True, 'message': 'Fastag record updated.', 'data': FastagRecordSerializer(record, context={'request': request}).data})


class FastagRefreshView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        try:
            record = FastagRecord.objects.get(pk=pk)
        except FastagRecord.DoesNotExist:
            return Response({'success': False, 'message': 'Fastag record not found.'}, status=status.HTTP_404_NOT_FOUND)
        if record.status == 'closed':
            return Response({'success': False, 'message': 'Cannot refresh a closed record.'}, status=status.HTTP_400_BAD_REQUEST)
        record.save()
        return Response({'success': True, 'message': 'Recharged amount refreshed.', 'data': FastagRecordSerializer(record, context={'request': request}).data})


class FastagMarkClosedView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        try:
            record = FastagRecord.objects.get(pk=pk)
        except FastagRecord.DoesNotExist:
            return Response({'success': False, 'message': 'Fastag record not found.'}, status=status.HTTP_404_NOT_FOUND)
        if record.status == 'closed':
            return Response({'success': False, 'message': 'Record is already closed.'}, status=status.HTTP_400_BAD_REQUEST)
        if record.status == 'open':
            return Response({'success': False, 'message': 'Submit fastag_debited_amount before closing.'}, status=status.HTTP_400_BAD_REQUEST)
        record.mark_closed(closed_by_user=request.user)
        return Response({'success': True, 'message': 'Fastag record closed. Next month record created/updated.', 'data': FastagRecordSerializer(record, context={'request': request}).data})


class FastagReopenView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        try:
            record = FastagRecord.objects.get(pk=pk)
        except FastagRecord.DoesNotExist:
            return Response({'success': False, 'message': 'Fastag record not found.'}, status=status.HTTP_404_NOT_FOUND)
        if record.status != 'submitted':
            return Response({'success': False, 'message': 'Only submitted records can be reopened.'}, status=status.HTTP_400_BAD_REQUEST)
        record.status = 'open'
        record.statement_submitted_at = None
        record.save(update_fields=['status', 'statement_submitted_at', 'updated_at'])
        return Response({'success': True, 'message': 'Fastag record reopened.', 'data': FastagRecordSerializer(record, context={'request': request}).data})


# ── CompanyExpense ────────────────────────────────────────────────────────────

class CompanyExpenseListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return CompanyExpenseWriteSerializer if self.request.method == 'POST' else CompanyExpenseSerializer

    def get_queryset(self):
        qs = CompanyExpense.objects.select_related('created_by').order_by('-expense_date', '-created_at')
        params = self.request.query_params
        if params.get('expense_type'):
            qs = qs.filter(expense_type=params['expense_type'])
        if params.get('month_year'):
            qs = qs.filter(month_year=params['month_year'])
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({'success': True, 'data': {'expenses': CompanyExpenseSerializer(qs, many=True, context={'request': request}).data, 'total': qs.count()}})

    def create(self, request, *args, **kwargs):
        serializer = CompanyExpenseWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        return Response(
            {'success': True, 'message': 'Company expense recorded.', 'data': CompanyExpenseSerializer(expense, context={'request': request}).data},
            status=status.HTTP_201_CREATED,
        )


class CompanyExpenseSummaryView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        qs = CompanyExpense.objects.all()
        if request.query_params.get('month_year'):
            qs = qs.filter(month_year=request.query_params['month_year'])
        by_type = {}
        for choice_value, _ in CompanyExpense.EXPENSE_TYPE_CHOICES:
            total = qs.filter(expense_type=choice_value).aggregate(t=Sum('amount'))['t'] or 0
            by_type[choice_value] = float(total)
        return Response({'success': True, 'data': {'total': float(sum(by_type.values())), 'by_type': by_type}})


class CompanyExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CompanyExpense.objects.select_related('created_by')
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return CompanyExpenseWriteSerializer if self.request.method in ('PUT', 'PATCH') else CompanyExpenseSerializer

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response({'success': True, 'data': CompanyExpenseSerializer(obj, context={'request': request}).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        obj = self.get_object()
        serializer = CompanyExpenseWriteSerializer(obj, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        return Response({'success': True, 'message': 'Company expense updated.', 'data': CompanyExpenseSerializer(expense, context={'request': request}).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({'success': True, 'message': 'Company expense deleted.'}, status=status.HTTP_200_OK)
