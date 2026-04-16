"""
Drivers Views
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwnerOrCoordinator
from .models import Driver
from .serializers import (
    DriverCreateSerializer,
    DriverSerializer,
    DriverUpdateSerializer,
)


class DriverListCreateView(generics.ListCreateAPIView):
    """List all drivers or create new driver"""

    permission_classes = [IsOwnerOrCoordinator]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DriverCreateSerializer
        return DriverSerializer

    def get_queryset(self):
        queryset = Driver.objects.select_related('user').prefetch_related(
            'vehicle_mappings__vehicle'
        )

        is_active = self.request.query_params.get('is_active')
        vehicle_id = self.request.query_params.get('vehicle_id')

        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        if vehicle_id:
            queryset = queryset.filter(
                vehicle_mappings__vehicle_id=vehicle_id,
                vehicle_mappings__unassigned_at__isnull=True,
            )

        return queryset.distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response({
            'success': True,
            'data': {
                'drivers': serializer.data,
            },
            'meta': {
                'total': queryset.count(),
            },
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = serializer.save()

        response_serializer = DriverSerializer(driver, context={'request': request})
        return Response({
            'success': True,
            'message': 'Driver created successfully',
            'data': response_serializer.data,
        }, status=status.HTTP_201_CREATED)


class DriverDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete driver details"""

    queryset = Driver.objects.select_related('user').prefetch_related('vehicle_mappings__vehicle')
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DriverUpdateSerializer
        return DriverSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        driver = serializer.save()

        response_serializer = DriverSerializer(driver, context={'request': request})
        return Response({
            'success': True,
            'message': 'Driver updated successfully',
            'data': response_serializer.data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            'success': True,
            'message': 'Driver deleted successfully',
        }, status=status.HTTP_200_OK)


class DriverStatsView(APIView):
    """Get driver statistics"""

    permission_classes = [IsOwnerOrCoordinator]

    def get(self, request, pk):
        try:
            driver = Driver.objects.get(pk=pk)
        except Driver.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Driver not found',
            }, status=status.HTTP_404_NOT_FOUND)

        stats = {
            'total_trips': driver.get_total_trips_this_month(),
            'total_km': float(driver.get_total_km_this_month()),
            'total_advance': float(driver.get_total_advance_this_month()),
            'base_salary': float(driver.get_effective_base_salary()),
        }

        return Response({
            'success': True,
            'data': stats,
        })
