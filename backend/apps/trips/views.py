"""
Trips Views - Trip Management
"""
from django.utils import timezone
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import IsDriver, IsOwner, IsOwnerOrCoordinator
from .models import Store, Trip
from .serializers import (
    StoreSerializer,
    TripApprovalSerializer,
    TripCreateSerializer,
    TripRejectionSerializer,
    TripSerializer,
    TripUpdateSerializer,
)


class TripListCreateView(generics.ListCreateAPIView):
    """List all trips or create new trip"""

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'driver', 'vehicle']
    ordering_fields = ['trip_date', 'created_at']
    ordering = ['-trip_date', '-created_at']
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TripCreateSerializer
        return TripSerializer

    def get_queryset(self):
        queryset = Trip.objects.select_related(
            'driver__user', 'vehicle', 'approved_by'
        )

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
        if not (request.user.is_owner() or request.user.is_coordinator()):
            raise PermissionDenied("You do not have permission to view all trips")

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response({
            'success': True,
            'data': {
                'trips': serializer.data,
            },
            'meta': {
                'total': queryset.count(),
            },
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        trip = serializer.save(created_by=request.user)

        # Trips created by admin/coordinator are auto-approved
        if request.user.is_owner() or request.user.is_coordinator():
            trip.approve(request.user)

        response_serializer = TripSerializer(trip, context={'request': request})
        return Response({
            'success': True,
            'message': 'Trip created successfully',
            'data': response_serializer.data,
        }, status=status.HTTP_201_CREATED)


class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete trip details"""

    queryset = Trip.objects.select_related('driver__user', 'vehicle', 'approved_by')
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TripUpdateSerializer
        return TripSerializer

    def _can_access_trip(self, user, trip):
        if user.is_owner() or user.is_coordinator():
            return True
        return user.is_driver_role() and hasattr(user, 'driver_profile') and trip.driver_id == user.driver_profile.id

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._can_access_trip(request.user, instance):
            raise PermissionDenied("You do not have permission to view this trip")

        serializer = self.get_serializer(instance, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_driver_role():
            if not (hasattr(request.user, 'driver_profile') and instance.driver_id == request.user.driver_profile.id):
                raise PermissionDenied("You can only edit your own trips")
            if instance.status != 'pending':
                raise PermissionDenied("You can only edit pending trips")
        elif not (request.user.is_owner() or request.user.is_coordinator()):
            raise PermissionDenied("You do not have permission to update this trip")

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        trip = serializer.save()

        response_serializer = TripSerializer(trip, context={'request': request})
        return Response({
            'success': True,
            'message': 'Trip updated successfully',
            'data': response_serializer.data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_driver_role():
            if not (hasattr(request.user, 'driver_profile') and instance.driver_id == request.user.driver_profile.id):
                raise PermissionDenied("You can only delete your own trips")
            if instance.status != 'pending':
                raise PermissionDenied("You can only delete pending trips")
        elif not (request.user.is_owner() or request.user.is_coordinator()):
            raise PermissionDenied("You do not have permission to delete this trip")

        instance.delete()
        return Response({
            'success': True,
            'message': 'Trip deleted successfully',
        }, status=status.HTTP_200_OK)


class TripApproveView(APIView):
    """Approve a trip"""

    permission_classes = [IsOwnerOrCoordinator]

    def post(self, request, pk):
        try:
            trip = Trip.objects.select_related('approved_by').get(pk=pk)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found',
            }, status=status.HTTP_404_NOT_FOUND)

        if trip.status != 'pending':
            return Response({
                'success': False,
                'message': f'Trip is already {trip.status}',
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = TripApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        remarks = serializer.validated_data.get('remarks')
        if remarks is not None:
            trip.remarks = remarks
            trip.save(update_fields=['remarks'])

        trip.approve(request.user)
        return Response({
            'success': True,
            'message': 'Trip approved successfully',
            'data': {
                'id': str(trip.id),
                'status': trip.status,
                'approved_by': {
                    'id': str(request.user.id),
                    'name': request.user.get_full_name(),
                },
                'approved_at': trip.approved_at,
                'remarks': trip.remarks,
            },
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
                'message': 'Trip not found',
            }, status=status.HTTP_404_NOT_FOUND)

        if trip.status != 'pending':
            return Response({
                'success': False,
                'message': f'Trip is already {trip.status}',
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
                'rejected_by': {
                    'id': str(request.user.id),
                    'name': request.user.get_full_name(),
                },
                'rejected_at': trip.approved_at,
            },
        })


class MyTripsView(APIView):
    """Get trips for logged-in driver"""

    permission_classes = [IsDriver]

    def get(self, request):
        driver = request.user.driver_profile

        status_param = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = Trip.objects.filter(driver=driver).select_related(
            'driver__user', 'vehicle', 'approved_by'
        )

        if status_param:
            queryset = queryset.filter(status=status_param)
        if start_date:
            queryset = queryset.filter(trip_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(trip_date__lte=end_date)

        queryset = queryset.order_by('-trip_date', '-created_at')
        serializer = TripSerializer(queryset, many=True, context={'request': request})

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
            'driver__user', 'vehicle', 'approved_by'
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
        from django.db.models import Count, Q, Sum

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = Trip.objects.all()

        if start_date:
            queryset = queryset.filter(trip_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(trip_date__lte=end_date)

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


class StoreListCreateView(APIView):
    """List all active stores (searchable) and allow owner/coordinator to create new ones"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Store.objects.filter(is_active=True)
        search = request.query_params.get('q', '').strip()
        if search:
            queryset = queryset.filter(name__icontains=search)
        serializer = StoreSerializer(queryset[:50], many=True)
        return Response({'success': True, 'data': serializer.data})

    def post(self, request):
        if not (request.user.is_owner() or request.user.is_coordinator()):
            return Response(
                {'success': False, 'message': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = StoreSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'message': 'Invalid data', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        store = serializer.save()
        return Response(
            {'success': True, 'message': 'Store created', 'data': StoreSerializer(store).data},
            status=status.HTTP_201_CREATED
        )


class StoreDetailView(APIView):
    """Get / update / deactivate a store (owner/coordinator only for write)"""

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return Store.objects.get(pk=pk)
        except Store.DoesNotExist:
            return None

    def get(self, request, pk):
        store = self.get_object(pk)
        if not store:
            return Response({'success': False, 'message': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': StoreSerializer(store).data})

    def patch(self, request, pk):
        if not (request.user.is_owner() or request.user.is_coordinator()):
            return Response({'success': False, 'message': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        store = self.get_object(pk)
        if not store:
            return Response({'success': False, 'message': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StoreSerializer(store, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'message': 'Invalid data', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        store = serializer.save()
        return Response({'success': True, 'data': StoreSerializer(store).data})
