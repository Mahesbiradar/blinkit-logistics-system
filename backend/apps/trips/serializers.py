"""
Trips Serializers
"""
from rest_framework import serializers
from .models import Trip


class TripSerializer(serializers.ModelSerializer):
    """Trip Serializer with full details"""
    
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    driver_phone = serializers.CharField(source='driver.user.phone', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    gate_pass_image_url = serializers.SerializerMethodField()
    map_screenshot_url = serializers.SerializerMethodField()
    
    trip_1 = serializers.SerializerMethodField()
    trip_2 = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'trip_date', 'warehouse',
            'driver', 'driver_name', 'driver_phone',
            'vehicle', 'vehicle_number',
            'trip_1', 'trip_2', 'total_km',
            'gate_pass_image_url', 'map_screenshot_url',
            'status', 'approved_by', 'approved_by_name',
            'approved_at', 'rejection_reason', 'remarks',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_km', 'approved_by', 'approved_at',
            'created_at', 'updated_at'
        ]
    
    def get_gate_pass_image_url(self, obj):
        if obj.gate_pass_image:
            return self.context['request'].build_absolute_uri(obj.gate_pass_image.url)
        return None
    
    def get_map_screenshot_url(self, obj):
        if obj.map_screenshot:
            return self.context['request'].build_absolute_uri(obj.map_screenshot.url)
        return None
    
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
    
    gate_pass_image = serializers.ImageField(required=True)
    map_screenshot = serializers.ImageField(required=True)
    
    class Meta:
        model = Trip
        fields = [
            'trip_date', 'warehouse',
            'dispatch_time_1', 'store_name_1', 'one_way_km_1',
            'dispatch_time_2', 'store_name_2', 'one_way_km_2',
            'gate_pass_image', 'map_screenshot', 'remarks'
        ]
    
    def validate(self, data):
        """Validate trip data"""
        # At least one trip must have data
        has_trip1 = data.get('store_name_1') and data.get('one_way_km_1')
        has_trip2 = data.get('store_name_2') and data.get('one_way_km_2')
        
        if not has_trip1 and not has_trip2:
            raise serializers.ValidationError(
                "At least one trip must have store name and KM"
            )
        
        # Validate KM values
        if data.get('one_way_km_1') and data['one_way_km_1'] <= 0:
            raise serializers.ValidationError({
                'one_way_km_1': 'KM must be greater than 0'
            })
        
        if data.get('one_way_km_2') and data['one_way_km_2'] <= 0:
            raise serializers.ValidationError({
                'one_way_km_2': 'KM must be greater than 0'
            })
        
        # Trip date cannot be in the future
        if data.get('trip_date') and data['trip_date'] > timezone.now().date():
            raise serializers.ValidationError({
                'trip_date': 'Trip date cannot be in the future'
            })
        
        return data
    
    def create(self, validated_data):
        """Create trip with auto-assigned driver and vehicle"""
        request = self.context.get('request')
        driver = request.user.driver_profile
        
        # Get primary vehicle
        vehicle = driver.get_primary_vehicle()
        if not vehicle:
            raise serializers.ValidationError(
                "No vehicle assigned to driver"
            )
        
        validated_data['driver'] = driver
        validated_data['vehicle'] = vehicle
        
        return super().create(validated_data)


class TripUpdateSerializer(serializers.ModelSerializer):
    """Trip Update Serializer (for coordinators)"""
    
    class Meta:
        model = Trip
        fields = [
            'one_way_km_1', 'one_way_km_2',
            'store_name_1', 'store_name_2',
            'dispatch_time_1', 'dispatch_time_2',
            'remarks'
        ]
    
    def validate(self, data):
        """Validate update data"""
        instance = self.instance
        
        # Validate KM values
        km1 = data.get('one_way_km_1', instance.one_way_km_1)
        km2 = data.get('one_way_km_2', instance.one_way_km_2)
        
        if km1 and km1 <= 0:
            raise serializers.ValidationError({
                'one_way_km_1': 'KM must be greater than 0'
            })
        
        if km2 and km2 <= 0:
            raise serializers.ValidationError({
                'one_way_km_2': 'KM must be greater than 0'
            })
        
        return data


class TripApprovalSerializer(serializers.Serializer):
    """Trip Approval Serializer"""
    remarks = serializers.CharField(required=False, allow_blank=True)


class TripRejectionSerializer(serializers.Serializer):
    """Trip Rejection Serializer"""
    rejection_reason = serializers.CharField(required=True)


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


from django.utils import timezone
