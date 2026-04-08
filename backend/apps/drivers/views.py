"""
Drivers Views
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwnerOrCoordinator
from .models import Driver
from .serializers import (
    DriverSerializer, DriverCreateSerializer, 
    DriverUpdateSerializer, DriverStatsSerializer
)


class DriverListCreateView(generics.ListCreateAPIView):
    """List all drivers or create new driver"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DriverCreateSerializer
        return DriverSerializer
    
    def get_queryset(self):
        queryset = Driver.objects.select_related('user').prefetch_related('vehicle_mappings')
        
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
                'drivers': serializer.data
            }
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create user and driver
        from apps.accounts.models import User
        from apps.vehicles.models import Vehicle
        
        data = serializer.validated_data
        
        # Create user
        user = User.objects.create_user(
            phone=data['phone'],
            first_name=data['first_name'],
            last_name=data.get('last_name', ''),
            role='driver'
        )
        
        # Create driver
        driver = Driver.objects.create(
            user=user,
            license_number=data.get('license_number', ''),
            base_salary=data.get('base_salary', 0)
        )
        
        # Assign vehicle if provided
        if data.get('vehicle_id'):
            try:
                vehicle = Vehicle.objects.get(id=data['vehicle_id'])
                from .models import DriverVehicleMapping
                DriverVehicleMapping.objects.create(
                    driver=driver,
                    vehicle=vehicle,
                    is_primary=True
                )
            except Vehicle.DoesNotExist:
                pass
        
        response_serializer = DriverSerializer(driver)
        
        return Response({
            'success': True,
            'message': 'Driver created successfully',
            'data': response_serializer.data
        }, status=status.HTTP_201_CREATED)


class DriverDetailView(generics.RetrieveUpdateAPIView):
    """Get or update driver details"""
    queryset = Driver.objects.select_related('user').prefetch_related('vehicle_mappings')
    permission_classes = [IsOwnerOrCoordinator]
    lookup_field = 'pk'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DriverUpdateSerializer
        return DriverSerializer
    
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
        driver = serializer.save()
        
        response_serializer = DriverSerializer(driver)
        
        return Response({
            'success': True,
            'message': 'Driver updated successfully',
            'data': response_serializer.data
        })


class DriverStatsView(APIView):
    """Get driver statistics"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get(self, request, pk):
        try:
            driver = Driver.objects.get(pk=pk)
        except Driver.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Driver not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        from django.utils import timezone
        current_month = timezone.now().replace(day=1)
        
        stats = {
            'total_trips': driver.get_total_trips_this_month(),
            'total_km': float(driver.get_total_km_this_month()),
            'total_advance': float(driver.get_total_advance_this_month()),
            'base_salary': float(driver.get_effective_base_salary()),
        }
        
        return Response({
            'success': True,
            'data': stats
        })
