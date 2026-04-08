"""
Payments Views
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import IsOwnerOrCoordinator
from .models import Payment
from .serializers import (
    PaymentSerializer, PaymentListSerializer,
    PaymentCreateSerializer, PaymentMarkPaidSerializer
)


class PaymentListView(generics.ListCreateAPIView):
    """List all payments or create a new payment"""
    queryset = Payment.objects.select_related('driver__user', 'vehicle', 'vendor')
    permission_classes = [IsOwnerOrCoordinator]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'payment_type', 'driver', 'vendor']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PaymentCreateSerializer
        return PaymentListSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter by month_year
        month_year = request.query_params.get('month_year')
        if month_year:
            queryset = queryset.filter(month_year=month_year)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': {
                'payments': serializer.data
            }
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        date = data['month_year']
        
        if data.get('driver_id'):
            from apps.drivers.models import Driver
            driver = Driver.objects.get(id=data['driver_id'])
            calculation = Payment.calculate_driver_salary(driver, date.year, date.month)
            calculation['driver'] = driver
            calculation['payment_type'] = 'salary'
            
        elif data.get('vendor_id'):
            from apps.vehicles.models import Vendor, Vehicle
            vendor = Vendor.objects.get(id=data['vendor_id'])
            vehicle = Vehicle.objects.get(id=data['vehicle_id']) if data.get('vehicle_id') else None
            calculation = Payment.calculate_vendor_payment(vendor, vehicle, date.year, date.month)
            calculation['vendor'] = vendor
            calculation['vehicle'] = vehicle
            calculation['payment_type'] = 'vendor_payment'
        
        payment = Payment.objects.create(**calculation)
        
        response_serializer = PaymentSerializer(payment)
        
        return Response({
            'success': True,
            'message': 'Payment created successfully',
            'data': response_serializer.data
        }, status=status.HTTP_201_CREATED)


class PaymentCalculateView(APIView):
    """Calculate payment for driver or vendor"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def post(self, request):
        driver_id = request.data.get('driver_id')
        vendor_id = request.data.get('vendor_id')
        vehicle_id = request.data.get('vehicle_id')
        month_year = request.data.get('month_year')
        
        if not month_year:
            return Response({
                'success': False,
                'message': 'month_year is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from datetime import datetime
        try:
            date = datetime.strptime(month_year, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'success': False,
                'message': 'Invalid month_year format. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if driver_id:
            # Calculate driver salary
            from apps.drivers.models import Driver
            try:
                driver = Driver.objects.get(id=driver_id)
            except Driver.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Driver not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            calculation = Payment.calculate_driver_salary(driver, date.year, date.month)
            
        elif vendor_id and vehicle_id:
            # Calculate vendor payment
            from apps.vehicles.models import Vendor, Vehicle
            try:
                vendor = Vendor.objects.get(id=vendor_id)
                vehicle = Vehicle.objects.get(id=vehicle_id)
            except (Vendor.DoesNotExist, Vehicle.DoesNotExist):
                return Response({
                    'success': False,
                    'message': 'Vendor or Vehicle not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            calculation = Payment.calculate_vendor_payment(vendor, vehicle, date.year, date.month)
        else:
            return Response({
                'success': False,
                'message': 'Either driver_id or (vendor_id and vehicle_id) is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'data': calculation
        })


class PaymentDetailView(generics.RetrieveAPIView):
    """Get payment details"""
    queryset = Payment.objects.select_related('driver__user', 'vehicle', 'vendor')
    serializer_class = PaymentSerializer
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'


class PaymentMarkPaidView(APIView):
    """Mark payment as paid"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def post(self, request, pk):
        try:
            payment = Payment.objects.get(pk=pk)
        except Payment.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Payment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if payment.status == 'paid':
            return Response({
                'success': False,
                'message': 'Payment is already marked as paid'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = PaymentMarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        payment.mark_paid(
            request.user,
            payment_mode=serializer.validated_data.get('payment_mode', ''),
            reference=serializer.validated_data.get('transaction_reference', '')
        )
        
        return Response({
            'success': True,
            'message': 'Payment marked as paid',
            'data': {
                'id': str(payment.id),
                'status': payment.status,
                'paid_at': payment.paid_at,
                'paid_by': request.user.get_full_name()
            }
        })
