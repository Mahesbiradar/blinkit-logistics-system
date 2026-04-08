"""
Trips Views - Trip Management
"""
from django.utils import timezone
from rest_framework import status, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import IsOwnerOrCoordinator, IsDriver
from .models import Trip
from .serializers import (
    TripSerializer, TripListSerializer, TripCreateSerializer,
    TripUpdateSerializer, TripApprovalSerializer, TripRejectionSerializer,
    DriverTripSummarySerializer
)


class TripListCreateView(generics.ListCreateAPIView):
    """List all trips or create new trip"""
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'driver', 'vehicle']
    ordering_fields = ['trip_date', 'created_at']
    ordering = ['-trip_date', '-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TripCreateSerializer
        return TripSerializer
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsDriver()]
        return [IsOwnerOrCoordinator()]
    
    def get_queryset(self):
        queryset = Trip.objects.select_related(
            'driver__user', 'vehicle', 'approved_by'
        )
        
        # Filter by query params
        driver_id = self.request.query_params.get('driver_id')
        vehicle_id = self.request.query_params.get('vehicle_id')
        status_param = self.request.query_params.get('status')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if start_date:
            queryset = queryset.filter(trip_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(trip_date__lte=end_date)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': {
                'trips': serializer.data
            }
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        trip = serializer.save()
        
        # Return full trip data
        response_serializer = TripSerializer(trip, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Trip created successfully',
            'data': response_serializer.data
        }, status=status.HTTP_201_CREATED)


class TripDetailView(generics.RetrieveUpdateAPIView):
    """Get or update trip details"""
    queryset = Trip.objects.select_related('driver__user', 'vehicle', 'approved_by')
    serializer_class = TripSerializer
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TripUpdateSerializer
        return TripSerializer
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        trip = serializer.save()
        
        # Return full trip data
        response_serializer = TripSerializer(trip, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Trip updated successfully',
            'data': response_serializer.data
        })


class TripApproveView(APIView):
    """Approve a trip"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def post(self, request, pk):
        try:
            trip = Trip.objects.get(pk=pk)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if trip.status != 'pending':
            return Response({
                'success': False,
                'message': f'Trip is already {trip.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TripApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        trip.approve(request.user)
        
        return Response({
            'success': True,
            'message': 'Trip approved successfully',
            'data': {
                'id': str(trip.id),
                'status': trip.status,
                'approved_by': request.user.get_full_name(),
                'approved_at': trip.approved_at
            }
        })


class TripRejectView(APIView):
    """Reject a trip"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def post(self, request, pk):
        try:
            trip = Trip.objects.get(pk=pk)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if trip.status != 'pending':
            return Response({
                'success': False,
                'message': f'Trip is already {trip.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TripRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data.get('rejection_reason', '')
        trip.reject(request.user, reason)
        
        return Response({
            'success': True,
            'message': 'Trip rejected',
            'data': {
                'id': str(trip.id),
                'status': trip.status,
                'rejection_reason': trip.rejection_reason,
                'rejected_by': request.user.get_full_name(),
                'rejected_at': trip.approved_at
            }
        })


class MyTripsView(APIView):
    """Get trips for logged-in driver"""
    permission_classes = [IsDriver]
    
    def get(self, request):
        driver = request.user.driver_profile
        
        # Get query params
        status_param = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Base queryset
        queryset = Trip.objects.filter(driver=driver).select_related('vehicle')
        
        # Apply filters
        if status_param:
            queryset = queryset.filter(status=status_param)
        if start_date:
            queryset = queryset.filter(trip_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(trip_date__lte=end_date)
        
        # Order by date
        queryset = queryset.order_by('-trip_date', '-created_at')
        
        # Serialize
        serializer = TripSerializer(queryset, many=True, context={'request': request})
        
        # Calculate summary
        total_trips = queryset.count()
        total_km = sum(trip.total_km for trip in queryset)
        pending_trips = queryset.filter(status='pending').count()
        approved_trips = queryset.filter(status='approved').count()
        
        return Response({
            'success': True,
            'data': {
                'trips': serializer.data,
                'summary': {
                    'total_trips': total_trips,
                    'total_km': float(total_km),
                    'pending_trips': pending_trips,
                    'approved_trips': approved_trips
                }
            }
        })


class PendingTripsView(APIView):
    """Get all pending trips (for coordinators)"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get(self, request):
        trips = Trip.objects.filter(status='pending').select_related(
            'driver__user', 'vehicle'
        ).order_by('-trip_date')
        
        serializer = TripSerializer(trips, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'data': {
                'trips': serializer.data,
                'count': trips.count()
            }
        })


class TripStatsView(APIView):
    """Get trip statistics"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get(self, request):
        from django.db.models import Sum, Count, Q
        
        # Get date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = Trip.objects.all()
        
        if start_date:
            queryset = queryset.filter(trip_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(trip_date__lte=end_date)
        
        # Current month stats if no date range
        if not start_date and not end_date:
            today = timezone.now().date()
            queryset = queryset.filter(
                trip_date__year=today.year,
                trip_date__month=today.month
            )
        
        stats = queryset.aggregate(
            total_trips=Count('id'),
            total_km=Sum('total_km'),
            pending_trips=Count('id', filter=Q(status='pending')),
            approved_trips=Count('id', filter=Q(status='approved')),
            rejected_trips=Count('id', filter=Q(status='rejected'))
        )
        
        return Response({
            'success': True,
            'data': {
                'total_trips': stats['total_trips'] or 0,
                'total_km': float(stats['total_km'] or 0),
                'pending_trips': stats['pending_trips'] or 0,
                'approved_trips': stats['approved_trips'] or 0,
                'rejected_trips': stats['rejected_trips'] or 0
            }
        })
