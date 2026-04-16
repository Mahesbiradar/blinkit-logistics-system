"""
Vehicles Views
"""
from django.db import transaction
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwnerOrCoordinator
from .models import Vehicle, Vendor
from .serializers import (
    VehicleAssignDriverSerializer,
    VehicleSerializer,
    VehicleWriteSerializer,
    VendorSerializer,
)


class VehicleListCreateView(generics.ListCreateAPIView):
    """List all vehicles or create new vehicle"""

    permission_classes = [IsOwnerOrCoordinator]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VehicleWriteSerializer
        return VehicleSerializer

    def get_queryset(self):
        queryset = Vehicle.objects.select_related('vendor').prefetch_related(
            'driver_mappings__driver__user'
        )

        owner_type = self.request.query_params.get('owner_type')
        is_active = self.request.query_params.get('is_active')

        if owner_type:
            queryset = queryset.filter(owner_type=owner_type)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': {
                'vehicles': serializer.data,
            },
            'meta': {
                'total': queryset.count(),
            },
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()

        response_serializer = VehicleSerializer(vehicle, context={'request': request})
        return Response({
            'success': True,
            'message': 'Vehicle created successfully',
            'data': response_serializer.data,
        }, status=status.HTTP_201_CREATED)


class VehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete vehicle details"""

    queryset = Vehicle.objects.select_related('vendor').prefetch_related('driver_mappings__driver__user')
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return VehicleWriteSerializer
        return VehicleSerializer

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
        vehicle = serializer.save()

        response_serializer = VehicleSerializer(vehicle, context={'request': request})
        return Response({
            'success': True,
            'message': 'Vehicle updated successfully',
            'data': response_serializer.data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            'success': True,
            'message': 'Vehicle deleted successfully',
        }, status=status.HTTP_200_OK)


class VehicleAssignDriverView(APIView):
    """Assign driver to vehicle"""

    permission_classes = [IsOwnerOrCoordinator]

    @transaction.atomic
    def post(self, request, pk):
        try:
            vehicle = Vehicle.objects.get(pk=pk, is_active=True)
        except Vehicle.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Vehicle not found',
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = VehicleAssignDriverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.drivers.models import DriverVehicleMapping

        driver = serializer.validated_data['driver_id']
        is_primary = serializer.validated_data.get('is_primary', False)

        if is_primary:
            DriverVehicleMapping.objects.filter(
                vehicle=vehicle,
                is_primary=True,
                unassigned_at__isnull=True,
            ).update(is_primary=False)
            DriverVehicleMapping.objects.filter(
                driver=driver,
                is_primary=True,
                unassigned_at__isnull=True,
            ).update(is_primary=False)

        mapping, _ = DriverVehicleMapping.objects.update_or_create(
            driver=driver,
            vehicle=vehicle,
            defaults={
                'is_primary': is_primary,
                'unassigned_at': None,
            }
        )

        return Response({
            'success': True,
            'message': 'Driver assigned successfully',
            'data': {
                'vehicle_id': str(vehicle.id),
                'driver': {
                    'id': str(driver.id),
                    'name': driver.user.get_full_name(),
                },
                'is_primary': mapping.is_primary,
                'assigned_at': mapping.assigned_at,
            },
        })


class VendorListCreateView(generics.ListCreateAPIView):
    """List all vendors or create new vendor"""

    queryset = Vendor.objects.prefetch_related('vehicles')
    serializer_class = VendorSerializer
    permission_classes = [IsOwnerOrCoordinator]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': {
                'vendors': serializer.data,
            },
            'meta': {
                'total': queryset.count(),
            },
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        return Response({
            'success': True,
            'message': 'Vendor created successfully',
            'data': VendorSerializer(vendor).data,
        }, status=status.HTTP_201_CREATED)


class VendorDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete vendor details"""

    queryset = Vendor.objects.prefetch_related('vehicles')
    serializer_class = VendorSerializer
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({
            'success': True,
            'data': self.get_serializer(instance).data,
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        return Response({
            'success': True,
            'message': 'Vendor updated successfully',
            'data': VendorSerializer(vendor).data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            'success': True,
            'message': 'Vendor deleted successfully',
        }, status=status.HTTP_200_OK)
