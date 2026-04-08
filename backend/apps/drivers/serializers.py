"""
Drivers Serializers
"""
from rest_framework import serializers
from .models import Driver, DriverVehicleMapping


class DriverVehicleMappingSerializer(serializers.ModelSerializer):
    """Driver-Vehicle Mapping Serializer"""
    
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    vehicle_id = serializers.UUIDField(source='vehicle.id', read_only=True)
    
    class Meta:
        model = DriverVehicleMapping
        fields = ['vehicle_id', 'vehicle_number', 'is_primary', 'assigned_at']


class DriverSerializer(serializers.ModelSerializer):
    """Driver Serializer"""
    
    user = serializers.SerializerMethodField()
    vehicles = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    effective_base_salary = serializers.DecimalField(
        source='get_effective_base_salary',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = Driver
        fields = [
            'id', 'user', 'license_number', 'license_expiry',
            'aadhar_number', 'emergency_contact', 'address',
            'base_salary', 'effective_base_salary',
            'joining_date', 'vehicles', 'stats',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user(self, obj):
        from apps.accounts.serializers import UserMinimalSerializer
        return UserMinimalSerializer(obj.user).data
    
    def get_vehicles(self, obj):
        """Get assigned vehicles"""
        mappings = obj.vehicle_mappings.filter(unassigned_at__isnull=True)
        return DriverVehicleMappingSerializer(mappings, many=True).data
    
    def get_stats(self, obj):
        """Get driver statistics"""
        return {
            'total_trips_this_month': obj.get_total_trips_this_month(),
            'approved_trips_this_month': obj.get_approved_trips_this_month(),
            'total_km_this_month': float(obj.get_total_km_this_month()),
            'total_advance_this_month': float(obj.get_total_advance_this_month()),
            'total_unpaid_advance': float(obj.get_total_unpaid_advance())
        }


class DriverMinimalSerializer(serializers.ModelSerializer):
    """Minimal Driver Serializer"""
    
    name = serializers.CharField(source='user.get_full_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        model = Driver
        fields = ['id', 'name', 'phone']


class DriverCreateSerializer(serializers.Serializer):
    """Driver Create Serializer"""
    
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=15, required=True)
    license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    base_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    vehicle_id = serializers.UUIDField(required=False)
    
    def validate_phone(self, value):
        """Validate phone number"""
        from apps.accounts.models import User
        
        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")
        
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Phone number already registered")
        
        return phone


class DriverUpdateSerializer(serializers.ModelSerializer):
    """Driver Update Serializer"""
    
    class Meta:
        model = Driver
        fields = [
            'license_number', 'license_expiry', 'aadhar_number',
            'emergency_contact', 'address', 'base_salary',
            'joining_date', 'is_active'
        ]


class DriverStatsSerializer(serializers.Serializer):
    """Driver Statistics Serializer"""
    
    total_trips = serializers.IntegerField()
    total_km = serializers.FloatField()
    total_advance = serializers.FloatField()
    base_salary = serializers.FloatField()
