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


class VehicleCreateDriverView(APIView):
    """Create a new driver account and assign to a vehicle (owner vehicles only)"""

    permission_classes = [IsOwnerOrCoordinator]

    @transaction.atomic
    def post(self, request, pk):
        try:
            vehicle = Vehicle.objects.get(pk=pk, is_active=True)
        except Vehicle.DoesNotExist:
            return Response({'success': False, 'message': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)

        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        phone = ''.join(filter(str.isdigit, request.data.get('phone', '')))
        password = request.data.get('password', '')

        if not first_name:
            return Response({'success': False, 'message': 'First name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if len(phone) != 10:
            return Response({'success': False, 'message': 'Phone must be 10 digits'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 6:
            return Response({'success': False, 'message': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.models import User
        from apps.drivers.models import Driver, DriverVehicleMapping
        from django.db import IntegrityError

        if User.objects.filter(phone=phone).exists():
            return Response({'success': False, 'message': 'Phone number already registered'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                phone=phone, first_name=first_name, last_name=last_name,
                role='driver', password=password, is_active=True,
            )
        except IntegrityError:
            return Response({'success': False, 'message': 'Phone already in use'}, status=status.HTTP_400_BAD_REQUEST)

        driver = Driver.objects.create(user=user, is_active=True)

        DriverVehicleMapping.objects.filter(vehicle=vehicle, is_primary=True, unassigned_at__isnull=True).update(is_primary=False)
        DriverVehicleMapping.objects.create(driver=driver, vehicle=vehicle, is_primary=True)

        return Response({
            'success': True,
            'message': 'Driver created and assigned',
            'data': {
                'driver_id': str(driver.id),
                'name': user.get_full_name(),
                'phone': user.phone,
            },
        }, status=status.HTTP_201_CREATED)


class VehicleDriverLoginView(APIView):
    """Update primary driver login details (phone / password)"""

    permission_classes = [IsOwnerOrCoordinator]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            vehicle = Vehicle.objects.get(pk=pk, is_active=True)
        except Vehicle.DoesNotExist:
            return Response({'success': False, 'message': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)

        from apps.drivers.models import DriverVehicleMapping
        mapping = DriverVehicleMapping.objects.filter(
            vehicle=vehicle, is_primary=True, unassigned_at__isnull=True
        ).select_related('driver__user').first()

        if not mapping:
            return Response({'success': False, 'message': 'No primary driver assigned to this vehicle'}, status=status.HTTP_404_NOT_FOUND)

        user = mapping.driver.user
        new_phone = request.data.get('phone', '').strip()
        new_phone = ''.join(filter(str.isdigit, new_phone)) if new_phone else ''
        new_password = request.data.get('password', '').strip()
        new_first_name = request.data.get('first_name', '').strip()
        new_last_name = request.data.get('last_name', '').strip()

        if new_phone and len(new_phone) != 10:
            return Response({'success': False, 'message': 'Phone must be 10 digits'}, status=status.HTTP_400_BAD_REQUEST)
        if new_phone and new_phone != user.phone:
            from apps.accounts.models import User as UserModel
            if UserModel.objects.filter(phone=new_phone).exclude(id=user.id).exists():
                return Response({'success': False, 'message': 'Phone already in use'}, status=status.HTTP_400_BAD_REQUEST)
            user.phone = new_phone
        if new_first_name:
            user.first_name = new_first_name
        if new_last_name is not None:
            user.last_name = new_last_name
        if new_password:
            if len(new_password) < 6:
                return Response({'success': False, 'message': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)

        user.save()

        return Response({
            'success': True,
            'message': 'Driver login details updated',
            'data': {'name': user.get_full_name(), 'phone': user.phone},
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
