"""
VehicleSettlement Views
"""
from rest_framework import generics, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwner
from .models import VehicleSettlement
from .serializers import (
    MarkPaidSerializer,
    VehicleSettlementCreateSerializer,
    VehicleSettlementPatchSerializer,
    VehicleSettlementSerializer,
    VehicleSettlementSummarySerializer,
)


class VehicleSettlementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return VehicleSettlementCreateSerializer if self.request.method == 'POST' else VehicleSettlementSerializer

    def get_queryset(self):
        qs = VehicleSettlement.objects.select_related('vehicle', 'paid_by', 'created_by').order_by('-month_year')
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
        return Response({'success': True, 'data': VehicleSettlementSerializer(qs, many=True, context={'request': request}).data})

    def create(self, request, *args, **kwargs):
        serializer = VehicleSettlementCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        settlement = serializer.save()
        return Response(
            {'success': True, 'message': 'Settlement created.', 'data': VehicleSettlementSerializer(settlement, context={'request': request}).data},
            status=status.HTTP_201_CREATED,
        )


class VehicleSettlementSummaryView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        month_year = request.query_params.get('month_year')
        if not month_year:
            return Response({'success': False, 'message': 'month_year query param is required.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = VehicleSettlement.objects.filter(month_year=month_year).select_related('vehicle')
        return Response({'success': True, 'data': VehicleSettlementSummarySerializer(qs, many=True, context={'request': request}).data})


class VehicleSettlementDetailView(generics.RetrieveUpdateAPIView):
    queryset = VehicleSettlement.objects.select_related('vehicle', 'paid_by', 'created_by')
    permission_classes = [IsOwner]

    def get_serializer_class(self):
        return VehicleSettlementPatchSerializer if self.request.method == 'PATCH' else VehicleSettlementSerializer

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response({'success': True, 'data': VehicleSettlementSerializer(obj, context={'request': request}).data})

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = VehicleSettlementPatchSerializer(obj, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        settlement = serializer.save()
        return Response({'success': True, 'message': 'Settlement updated.', 'data': VehicleSettlementSerializer(settlement, context={'request': request}).data})


class SettlementCalculateView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        try:
            settlement = VehicleSettlement.objects.select_related('vehicle').get(pk=pk)
        except VehicleSettlement.DoesNotExist:
            return Response({'success': False, 'message': 'Settlement not found.'}, status=status.HTTP_404_NOT_FOUND)
        settlement.calculate()
        return Response({'success': True, 'message': 'Settlement recalculated.', 'data': VehicleSettlementSerializer(settlement, context={'request': request}).data})


class SettlementFinalizeView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        try:
            settlement = VehicleSettlement.objects.get(pk=pk)
        except VehicleSettlement.DoesNotExist:
            return Response({'success': False, 'message': 'Settlement not found.'}, status=status.HTTP_404_NOT_FOUND)
        if settlement.status != 'draft':
            return Response({'success': False, 'message': 'Only draft settlements can be finalized.'}, status=status.HTTP_400_BAD_REQUEST)
        if settlement.base_amount <= 0:
            return Response({'success': False, 'message': 'base_amount must be > 0 before finalizing.'}, status=status.HTTP_400_BAD_REQUEST)
        settlement.status = 'finalized'
        settlement.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'message': 'Settlement finalized.', 'data': VehicleSettlementSerializer(settlement, context={'request': request}).data})


class SettlementMarkPaidView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        try:
            settlement = VehicleSettlement.objects.get(pk=pk)
        except VehicleSettlement.DoesNotExist:
            return Response({'success': False, 'message': 'Settlement not found.'}, status=status.HTTP_404_NOT_FOUND)
        if settlement.status != 'finalized':
            return Response({'success': False, 'message': 'Only finalized settlements can be marked paid.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = MarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        settlement.mark_paid(
            paid_by_user=request.user,
            paid_amount=data['paid_amount'],
            payment_mode=data.get('payment_mode', ''),
            transaction_reference=data.get('transaction_reference', ''),
        )
        return Response({'success': True, 'message': 'Settlement marked as paid.', 'data': VehicleSettlementSerializer(settlement, context={'request': request}).data})


class SettlementReopenView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        try:
            settlement = VehicleSettlement.objects.get(pk=pk)
        except VehicleSettlement.DoesNotExist:
            return Response({'success': False, 'message': 'Settlement not found.'}, status=status.HTTP_404_NOT_FOUND)
        if settlement.status != 'finalized':
            return Response({'success': False, 'message': 'Only finalized settlements can be reopened.'}, status=status.HTTP_400_BAD_REQUEST)
        settlement.status = 'draft'
        settlement.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'message': 'Settlement reopened.', 'data': VehicleSettlementSerializer(settlement, context={'request': request}).data})


class SettlementRecalculateFromTripsView(generics.GenericAPIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        settlement = get_object_or_404(VehicleSettlement, pk=pk)
        if settlement.status == 'paid':
            return Response(
                {'success': False, 'message': 'Cannot recalculate a paid settlement.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = settlement.recalculate_from_trips()
        settlement.calculate()
        return Response({
            'success': True,
            'data': VehicleSettlementSerializer(settlement, context={'request': request}).data,
            'message': f"Recalculated from {result['trip_count']} approved trips",
        })


class VehicleCarryForwardView(generics.GenericAPIView):
    """
    GET /api/v1/settlements/carry-forward/?vehicle_id=<id>
    Returns pending and overpaid carry-forward amounts for a vehicle
    from its most recent paid settlement.
    Used to show warning tags on vehicle cards.
    """
    permission_classes = [IsOwner]

    def get(self, request):
        vehicle_id = request.query_params.get('vehicle_id')
        if not vehicle_id:
            return Response(
                {'success': False, 'message': 'vehicle_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        latest = (
            VehicleSettlement.objects
            .filter(vehicle_id=vehicle_id, status='paid')
            .order_by('-month_year')
            .first()
        )

        if not latest:
            return Response({
                'success': True,
                'data': {
                    'vehicle_id': vehicle_id,
                    'has_pending': False,
                    'pending_prev_month': '0.00',
                    'overpaid_prev_month': '0.00',
                    'payment_status': None,
                    'from_month': None,
                }
            })

        return Response({
            'success': True,
            'data': {
                'vehicle_id': vehicle_id,
                'has_pending': (
                    float(latest.pending_prev_month) > 0 or
                    float(latest.overpaid_prev_month) > 0
                ),
                'pending_prev_month': str(latest.pending_prev_month),
                'overpaid_prev_month': str(latest.overpaid_prev_month),
                'payment_status': latest.payment_status,
                'from_month': str(latest.month_year),
            }
        })
