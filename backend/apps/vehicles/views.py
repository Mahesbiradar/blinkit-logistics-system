"""
Vehicles Views
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwnerOrCoordinator
from .models import Vehicle, Vendor
from .serializers import (
    VehicleSerializer, VehicleCreateSerializer,
    VendorSerializer, VehicleAssignDriverSerializer
)


class VehicleListCreateView(generics.ListCreateAPIView):
    """List all vehicles or create new vehicle"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VehicleCreateSerializer
        return VehicleSerializer
    
    def get_queryset(self):
        queryset = Vehicle.objects.select_related('vendor').prefetch_related('driver_mappings')
        
        # Filter by owner type
        owner_type = self.request.query_params.get('owner_type')
        if owner_type:
            queryset = queryset.filter(owner_type=owner_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': {
                'vehicles': serializer.data
            }
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        
        response_serializer = VehicleSerializer(vehicle)
        
        return Response({
            'success': True,
            'message': 'Vehicle created successfully',
            'data': response_serializer.data
        }, status=status.HTTP_201_CREATED)


class VehicleDetailView(generics.RetrieveUpdateAPIView):
    """Get or update vehicle details"""
    queryset = Vehicle.objects.select_related('vendor').prefetch_related('driver_mappings')
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'
    serializer_class = VehicleSerializer
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        
        response_serializer = VehicleSerializer(vehicle)
        
        return Response({
            'success': True,
            'message': 'Vehicle updated successfully',
            'data': response_serializer.data
        })


class VehicleAssignDriverView(APIView):
    """Assign driver to vehicle"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def post(self, request, pk):
        try:
            vehicle = Vehicle.objects.get(pk=pk)
        except Vehicle.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Vehicle not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = VehicleAssignDriverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from apps.drivers.models import Driver, DriverVehicleMapping
        
        try:
            driver = Driver.objects.get(id=serializer.validated_data['driver_id'])
        except Driver.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Driver not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Create or update mapping
        mapping, created = DriverVehicleMapping.objects.update_or_create(
            driver=driver,
            vehicle=vehicle,
            defaults={
                'is_primary': serializer.validated_data.get('is_primary', False),
                'unassigned_at': None
            }
        )
        
        return Response({
            'success': True,
            'message': 'Driver assigned successfully',
            'data': {
                'vehicle_id': str(vehicle.id),
                'driver': {
                    'id': str(driver.id),
                    'name': driver.user.get_full_name()
                },
                'is_primary': mapping.is_primary
            }
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
                'vendors': serializer.data
            }
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Vendor created successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)


class VendorDetailView(generics.RetrieveUpdateAPIView):
    """Get or update vendor details"""
    queryset = Vendor.objects.prefetch_related('vehicles')
    serializer_class = VendorSerializer
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'
