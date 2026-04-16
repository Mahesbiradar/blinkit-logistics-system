"""
Vehicles Serializers
"""
from rest_framework import serializers

from .models import Vehicle, Vendor


class VendorSerializer(serializers.ModelSerializer):
    """Vendor Serializer"""

    vehicles_count = serializers.SerializerMethodField()
    total_km_this_month = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            'id', 'name', 'phone', 'email', 'address',
            'contact_person', 'vehicles_count', 'total_km_this_month',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_vehicles_count(self, obj):
        return obj.vehicles.filter(is_active=True).count()

    def get_total_km_this_month(self, obj):
        return float(obj.get_total_km_this_month())


class VendorMinimalSerializer(serializers.ModelSerializer):
    """Minimal Vendor Serializer"""

    class Meta:
        model = Vendor
        fields = ['id', 'name', 'phone']


class VehicleSerializer(serializers.ModelSerializer):
    """Vehicle Serializer"""

    vendor_details = VendorMinimalSerializer(source='vendor', read_only=True)
    assigned_drivers = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'vehicle_number', 'vehicle_type', 'owner_type',
            'vendor', 'vendor_details', 'km_rate', 'base_salary',
            'fuel_average', 'insurance_expiry', 'fc_expiry',
            'assigned_drivers', 'stats',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_drivers(self, obj):
        mappings = obj.driver_mappings.filter(
            unassigned_at__isnull=True
        ).select_related('driver__user')
        return [
            {
                'id': str(mapping.driver.id),
                'name': mapping.driver.user.get_full_name(),
                'phone': mapping.driver.user.phone,
                'is_primary': mapping.is_primary,
            }
            for mapping in mappings
        ]

    def get_stats(self, obj):
        return {
            'total_trips_this_month': obj.get_total_trips_this_month(),
            'total_km_this_month': float(obj.get_total_km_this_month()),
            'total_expenses_this_month': float(obj.get_total_expenses_this_month()),
        }


class VehicleMinimalSerializer(serializers.ModelSerializer):
    """Minimal Vehicle Serializer"""

    class Meta:
        model = Vehicle
        fields = ['id', 'vehicle_number', 'vehicle_type', 'owner_type']


class VehicleWriteSerializer(serializers.ModelSerializer):
    """Vehicle create/update serializer"""

    class Meta:
        model = Vehicle
        fields = [
            'vehicle_number', 'vehicle_type', 'owner_type',
            'vendor', 'km_rate', 'base_salary',
            'fuel_average', 'insurance_expiry', 'fc_expiry', 'is_active'
        ]

    def validate_vehicle_number(self, value):
        normalized = value.strip().upper()
        queryset = Vehicle.objects.exclude(
            id=getattr(self.instance, 'id', None)
        ).filter(vehicle_number__iexact=normalized)
        if queryset.exists():
            raise serializers.ValidationError("Vehicle number already exists")
        return normalized

    def validate_vendor(self, value):
        if value and not value.is_active:
            raise serializers.ValidationError("Vendor is inactive")
        return value

    def validate(self, data):
        owner_type = data.get('owner_type', getattr(self.instance, 'owner_type', None))
        vendor = data.get('vendor', getattr(self.instance, 'vendor', None))

        if owner_type == 'vendor' and not vendor:
            raise serializers.ValidationError({
                'vendor': 'Vendor is required for vendor vehicles'
            })

        if owner_type == 'owner' and vendor:
            raise serializers.ValidationError({
                'vendor': 'Owner vehicles should not have a vendor'
            })

        if owner_type == 'owner':
            data['km_rate'] = data.get('km_rate', 0) or 0
        if owner_type == 'vendor':
            data['base_salary'] = data.get('base_salary', 0) or 0

        return data


class VehicleAssignDriverSerializer(serializers.Serializer):
    """Serializer for assigning driver to vehicle"""

    driver_id = serializers.UUIDField(required=True)
    is_primary = serializers.BooleanField(default=False)

    def validate_driver_id(self, value):
        from apps.drivers.models import Driver

        try:
            driver = Driver.objects.select_related('user').get(id=value, is_active=True)
        except Driver.DoesNotExist as exc:
            raise serializers.ValidationError("Driver not found") from exc
        return driver
