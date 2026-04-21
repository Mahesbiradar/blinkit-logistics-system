"""
Trips Serializers
"""
from django.utils import timezone
from rest_framework import serializers

from apps.drivers.models import Driver
from apps.vehicles.models import Vehicle
from .models import Store, Trip


class StoreSerializer(serializers.ModelSerializer):
    """Store master serializer"""

    class Meta:
        model = Store
        fields = ['id', 'name', 'code', 'area', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class TripSerializer(serializers.ModelSerializer):
    """Trip Serializer with full details"""

    driver = serializers.SerializerMethodField()
    driver_id = serializers.UUIDField(source='driver.id', read_only=True)
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    driver_phone = serializers.CharField(source='driver.user.phone', read_only=True)
    vehicle = serializers.SerializerMethodField()
    vehicle_id = serializers.UUIDField(source='vehicle.id', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    approved_by = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    gate_pass_image_url = serializers.SerializerMethodField()
    map_screenshot_url = serializers.SerializerMethodField()
    gate_pass_image_2_url = serializers.SerializerMethodField()
    map_screenshot_2_url = serializers.SerializerMethodField()
    trip_1 = serializers.SerializerMethodField()
    trip_2 = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            'id', 'trip_date', 'warehouse', 'trip_category',
            'driver', 'driver_id', 'driver_name', 'driver_phone',
            'vehicle', 'vehicle_id', 'vehicle_number',
            'dispatch_time_1', 'store_name_1', 'one_way_km_1',
            'dispatch_time_2', 'store_name_2', 'one_way_km_2',
            'trip_1', 'trip_2', 'total_km',
            'gate_pass_image_url', 'map_screenshot_url',
            'gate_pass_image_2_url', 'map_screenshot_2_url',
            'status', 'approved_by', 'approved_by_name',
            'approved_at', 'rejection_reason', 'remarks',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_km', 'approved_by', 'approved_at',
            'created_at', 'updated_at'
        ]

    def _build_absolute_uri(self, file_field):
        request = self.context.get('request')
        if not file_field:
            return None
        if request:
            return request.build_absolute_uri(file_field.url)
        return file_field.url

    def get_driver(self, obj):
        return {
            'id': str(obj.driver.id),
            'name': obj.driver.user.get_full_name(),
            'phone': obj.driver.user.phone,
        }

    def get_vehicle(self, obj):
        return {
            'id': str(obj.vehicle.id),
            'vehicle_number': obj.vehicle.vehicle_number,
            'vehicle_type': obj.vehicle.vehicle_type,
            'owner_type': obj.vehicle.owner_type,
        }

    def get_approved_by(self, obj):
        if not obj.approved_by:
            return None
        return {
            'id': str(obj.approved_by.id),
            'name': obj.approved_by.get_full_name(),
        }

    def get_gate_pass_image_url(self, obj):
        return self._build_absolute_uri(obj.gate_pass_image)

    def get_map_screenshot_url(self, obj):
        return self._build_absolute_uri(obj.map_screenshot)

    def get_gate_pass_image_2_url(self, obj):
        return self._build_absolute_uri(obj.gate_pass_image_2)

    def get_map_screenshot_2_url(self, obj):
        return self._build_absolute_uri(obj.map_screenshot_2)

    def get_trip_1(self, obj):
        if obj.has_trip1():
            return {
                'dispatch_time': obj.dispatch_time_1.strftime('%H:%M') if obj.dispatch_time_1 else None,
                'store_name': obj.store_name_1,
                'one_way_km': float(obj.one_way_km_1) if obj.one_way_km_1 else None,
                'round_trip_km': float(obj.get_trip1_km())
            }
        return None

    def get_trip_2(self, obj):
        if obj.has_trip2():
            return {
                'dispatch_time': obj.dispatch_time_2.strftime('%H:%M') if obj.dispatch_time_2 else None,
                'store_name': obj.store_name_2,
                'one_way_km': float(obj.one_way_km_2) if obj.one_way_km_2 else None,
                'round_trip_km': float(obj.get_trip2_km())
            }
        return None


class TripListSerializer(serializers.ModelSerializer):
    """Trip List Serializer (minimal fields)"""

    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)

    class Meta:
        model = Trip
        fields = [
            'id', 'trip_date', 'driver_name', 'vehicle_number',
            'store_name_1', 'store_name_2', 'total_km', 'status'
        ]


class TripCreateSerializer(serializers.ModelSerializer):
    """Trip Create Serializer"""

    driver_id = serializers.PrimaryKeyRelatedField(
        source='driver',
        queryset=Driver.objects.none(),
        required=False,
        write_only=True,
    )
    vehicle_id = serializers.PrimaryKeyRelatedField(
        source='vehicle',
        queryset=Vehicle.objects.none(),
        required=False,
        write_only=True,
    )
    gate_pass_image = serializers.ImageField(required=False, allow_null=True)
    map_screenshot = serializers.ImageField(required=False, allow_null=True)
    gate_pass_image_2 = serializers.ImageField(required=False, allow_null=True)
    map_screenshot_2 = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Trip
        fields = [
            'driver_id', 'vehicle_id',
            'trip_date', 'warehouse', 'trip_category',
            'dispatch_time_1', 'store_name_1', 'one_way_km_1',
            'dispatch_time_2', 'store_name_2', 'one_way_km_2',
            'gate_pass_image', 'map_screenshot',
            'gate_pass_image_2', 'map_screenshot_2',
            'remarks'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['driver_id'].queryset = Driver.objects.select_related('user').filter(is_active=True)
        self.fields['vehicle_id'].queryset = Vehicle.objects.filter(is_active=True)

    def validate(self, data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        trip_date = data.get('trip_date')
        if trip_date and trip_date > timezone.now().date():
            raise serializers.ValidationError({
                'trip_date': 'Trip date cannot be in the future'
            })

        for index in (1, 2):
            store_name = data.get(f'store_name_{index}')
            one_way_km = data.get(f'one_way_km_{index}')
            if store_name and not one_way_km:
                raise serializers.ValidationError({
                    f'one_way_km_{index}': 'KM is required when store name is provided'
                })
            if one_way_km and not store_name:
                raise serializers.ValidationError({
                    f'store_name_{index}': 'Store name is required when KM is provided'
                })
            if one_way_km is not None and one_way_km <= 0:
                raise serializers.ValidationError({
                    f'one_way_km_{index}': 'KM must be greater than 0'
                })

        has_trip1 = data.get('store_name_1') and data.get('one_way_km_1')
        has_trip2 = data.get('store_name_2') and data.get('one_way_km_2')
        if not has_trip1 and not has_trip2:
            raise serializers.ValidationError(
                "At least one trip must have store name and KM"
            )

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required")

        driver = data.get('driver')
        vehicle = data.get('vehicle')

        if user.is_driver_role():
            if not hasattr(user, 'driver_profile'):
                raise serializers.ValidationError("Driver profile not found")

            driver = user.driver_profile
            if vehicle is None:
                vehicle = driver.get_primary_vehicle()
            if vehicle is None:
                raise serializers.ValidationError({
                    'vehicle_id': 'No vehicle assigned to driver'
                })

            has_assignment = driver.vehicle_mappings.filter(
                vehicle=vehicle,
                unassigned_at__isnull=True,
            ).exists()
            if not has_assignment:
                raise serializers.ValidationError({
                    'vehicle_id': 'Vehicle is not assigned to this driver'
                })
        elif user.is_owner() or user.is_coordinator():
            if vehicle is None and driver is None:
                raise serializers.ValidationError({'vehicle_id': 'Vehicle is required'})
            if vehicle is None:
                vehicle = driver.get_primary_vehicle()
                if vehicle is None:
                    raise serializers.ValidationError({'vehicle_id': 'No vehicle assigned to this driver'})
            if driver is None:
                driver = vehicle.get_primary_driver()
                if driver is None:
                    raise serializers.ValidationError({'vehicle_id': 'No driver assigned to this vehicle'})
            else:
                has_assignment = driver.vehicle_mappings.filter(
                    vehicle=vehicle,
                    unassigned_at__isnull=True,
                ).exists()
                if not has_assignment:
                    raise serializers.ValidationError({
                        'vehicle_id': 'Vehicle is not assigned to the selected driver'
                    })
        else:
            raise serializers.ValidationError("You do not have permission to create trips")

        data['driver'] = driver
        data['vehicle'] = vehicle
        return data


class TripUpdateSerializer(serializers.ModelSerializer):
    """Trip Update Serializer"""

    gate_pass_image = serializers.ImageField(required=False, allow_null=True)
    map_screenshot = serializers.ImageField(required=False, allow_null=True)
    gate_pass_image_2 = serializers.ImageField(required=False, allow_null=True)
    map_screenshot_2 = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Trip
        fields = [
            'trip_date', 'trip_category', 'warehouse',
            'dispatch_time_1', 'dispatch_time_2',
            'store_name_1', 'store_name_2',
            'one_way_km_1', 'one_way_km_2',
            'gate_pass_image', 'map_screenshot',
            'gate_pass_image_2', 'map_screenshot_2',
            'remarks'
        ]

    def validate(self, data):
        instance = self.instance

        trip_date = data.get('trip_date', instance.trip_date)
        if trip_date and trip_date > timezone.now().date():
            raise serializers.ValidationError({
                'trip_date': 'Trip date cannot be in the future'
            })

        for index in (1, 2):
            store_name = data.get(f'store_name_{index}', getattr(instance, f'store_name_{index}'))
            one_way_km = data.get(f'one_way_km_{index}', getattr(instance, f'one_way_km_{index}'))
            if store_name and not one_way_km:
                raise serializers.ValidationError({
                    f'one_way_km_{index}': 'KM is required when store name is provided'
                })
            if one_way_km and not store_name:
                raise serializers.ValidationError({
                    f'store_name_{index}': 'Store name is required when KM is provided'
                })
            if one_way_km is not None and one_way_km <= 0:
                raise serializers.ValidationError({
                    f'one_way_km_{index}': 'KM must be greater than 0'
                })

        if not (
            data.get('store_name_1', instance.store_name_1) and data.get('one_way_km_1', instance.one_way_km_1)
        ) and not (
            data.get('store_name_2', instance.store_name_2) and data.get('one_way_km_2', instance.one_way_km_2)
        ):
            raise serializers.ValidationError(
                "At least one trip must have store name and KM"
            )

        return data


class TripApprovalSerializer(serializers.Serializer):
    """Trip Approval Serializer"""

    remarks = serializers.CharField(required=False, allow_blank=True)


class TripRejectionSerializer(serializers.Serializer):
    """Trip Rejection Serializer"""

    rejection_reason = serializers.CharField(required=True, allow_blank=False)


class TripFilterSerializer(serializers.Serializer):
    """Trip Filter Serializer"""

    driver_id = serializers.UUIDField(required=False)
    vehicle_id = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(
        choices=['pending', 'approved', 'rejected'],
        required=False
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)


class DriverTripSummarySerializer(serializers.Serializer):
    """Driver Trip Summary Serializer"""

    total_trips = serializers.IntegerField()
    total_km = serializers.FloatField()
    pending_trips = serializers.IntegerField()
    approved_trips = serializers.IntegerField()
