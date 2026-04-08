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
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_vehicles_count(self, obj):
        return obj.vehicles.filter(is_active=True).count()
    
    def get_total_km_this_month(self, obj):
        return obj.get_total_km_this_month()


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
        """Get assigned drivers"""
        from apps.drivers.serializers import DriverMinimalSerializer
        drivers = obj.get_all_active_drivers()
        mappings = obj.driver_mappings.filter(unassigned_at__isnull=True)
        
        result = []
        for mapping in mappings:
            result.append({
                'id': str(mapping.driver.id),
                'name': mapping.driver.user.get_full_name(),
                'is_primary': mapping.is_primary
            })
        return result
    
    def get_stats(self, obj):
        """Get vehicle statistics"""
        return {
            'total_trips_this_month': obj.get_total_trips_this_month(),
            'total_km_this_month': float(obj.get_total_km_this_month()),
            'total_expenses_this_month': float(obj.get_total_expenses_this_month())
        }


class VehicleMinimalSerializer(serializers.ModelSerializer):
    """Minimal Vehicle Serializer"""
    
    class Meta:
        model = Vehicle
        fields = ['id', 'vehicle_number', 'vehicle_type', 'owner_type']


class VehicleCreateSerializer(serializers.ModelSerializer):
    """Vehicle Create Serializer"""
    
    class Meta:
        model = Vehicle
        fields = [
            'vehicle_number', 'vehicle_type', 'owner_type',
            'vendor', 'km_rate', 'base_salary',
            'fuel_average', 'insurance_expiry', 'fc_expiry'
        ]
    
    def validate(self, data):
        """Validate vehicle data"""
        owner_type = data.get('owner_type')
        vendor = data.get('vendor')
        
        if owner_type == 'vendor' and not vendor:
            raise serializers.ValidationError({
                'vendor': 'Vendor is required for vendor vehicles'
            })
        
        if owner_type == 'owner' and vendor:
            raise serializers.ValidationError({
                'vendor': 'Owner vehicles should not have a vendor'
            })
        
        return data


class VehicleAssignDriverSerializer(serializers.Serializer):
    """Serializer for assigning driver to vehicle"""
    driver_id = serializers.UUIDField(required=True)
    is_primary = serializers.BooleanField(default=False)
