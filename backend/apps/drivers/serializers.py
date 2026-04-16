"""
Drivers Serializers
"""
from django.db import transaction
from rest_framework import serializers

from .models import Driver, DriverVehicleMapping


class DriverVehicleMappingSerializer(serializers.ModelSerializer):
    """Driver-Vehicle Mapping Serializer"""

    id = serializers.UUIDField(source='vehicle.id', read_only=True)
    vehicle_id = serializers.UUIDField(source='vehicle.id', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)

    class Meta:
        model = DriverVehicleMapping
        fields = ['id', 'vehicle_id', 'vehicle_number', 'is_primary', 'assigned_at']


class DriverSerializer(serializers.ModelSerializer):
    """Driver Serializer"""

    user = serializers.SerializerMethodField()
    vehicles = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    effective_base_salary = serializers.SerializerMethodField()

    class Meta:
        model = Driver
        fields = [
            'id', 'user', 'license_number', 'license_expiry',
            'aadhar_number', 'emergency_contact', 'address',
            'base_salary', 'effective_base_salary',
            'joining_date', 'vehicles', 'stats',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user(self, obj):
        from apps.accounts.serializers import UserMinimalSerializer
        return UserMinimalSerializer(obj.user).data

    def get_vehicles(self, obj):
        mappings = obj.vehicle_mappings.filter(
            unassigned_at__isnull=True
        ).select_related('vehicle')
        return DriverVehicleMappingSerializer(mappings, many=True).data

    def get_stats(self, obj):
        return {
            'total_trips_this_month': obj.get_total_trips_this_month(),
            'approved_trips_this_month': obj.get_approved_trips_this_month(),
            'total_km_this_month': float(obj.get_total_km_this_month()),
            'total_advance_this_month': float(obj.get_total_advance_this_month()),
            'total_unpaid_advance': float(obj.get_total_unpaid_advance()),
        }

    def get_effective_base_salary(self, obj):
        return float(obj.get_effective_base_salary())


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
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_expiry = serializers.DateField(required=False, allow_null=True)
    aadhar_number = serializers.CharField(max_length=12, required=False, allow_blank=True)
    emergency_contact = serializers.CharField(max_length=15, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    base_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    joining_date = serializers.DateField(required=False, allow_null=True)
    vehicle_id = serializers.UUIDField(required=False, allow_null=True)
    is_primary_vehicle = serializers.BooleanField(required=False, default=True)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_phone(self, value):
        from apps.accounts.models import User

        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Phone number already registered")
        return phone

    def validate_license_number(self, value):
        if not value:
            return ''
        qs = Driver.objects.filter(license_number=value)
        if qs.exists():
            raise serializers.ValidationError("License number already exists")
        return value

    def validate_vehicle_id(self, value):
        if value is None:
            return value

        from apps.vehicles.models import Vehicle

        try:
            vehicle = Vehicle.objects.get(id=value, is_active=True)
        except Vehicle.DoesNotExist as exc:
            raise serializers.ValidationError("Vehicle not found") from exc
        return vehicle

    @transaction.atomic
    def create(self, validated_data):
        from apps.accounts.models import User

        vehicle = validated_data.pop('vehicle_id', None)
        is_primary_vehicle = validated_data.pop('is_primary_vehicle', True)
        email = validated_data.pop('email', None) or None

        user = User.objects.create_user(
            phone=validated_data.pop('phone'),
            first_name=validated_data.pop('first_name'),
            last_name=validated_data.pop('last_name', ''),
            email=email,
            role='driver',
        )

        driver = Driver.objects.create(user=user, **validated_data)

        if vehicle:
            if is_primary_vehicle:
                DriverVehicleMapping.objects.filter(
                    driver=driver,
                    is_primary=True,
                    unassigned_at__isnull=True,
                ).update(is_primary=False)
            DriverVehicleMapping.objects.create(
                driver=driver,
                vehicle=vehicle,
                is_primary=is_primary_vehicle,
            )

        return driver


class DriverUpdateSerializer(serializers.Serializer):
    """Driver Update Serializer"""

    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=15, required=False)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_expiry = serializers.DateField(required=False, allow_null=True)
    aadhar_number = serializers.CharField(max_length=12, required=False, allow_blank=True)
    emergency_contact = serializers.CharField(max_length=15, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    base_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    joining_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    def validate_phone(self, value):
        from apps.accounts.models import User

        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")

        user = self.instance.user
        if User.objects.exclude(id=user.id).filter(phone=phone).exists():
            raise serializers.ValidationError("Phone number already registered")
        return phone

    def validate_license_number(self, value):
        if not value:
            return ''

        qs = Driver.objects.exclude(id=self.instance.id).filter(license_number=value)
        if qs.exists():
            raise serializers.ValidationError("License number already exists")
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        user = instance.user

        user_fields = ['first_name', 'last_name', 'phone', 'email']
        for field in user_fields:
            if field in validated_data:
                setattr(user, field, validated_data.pop(field) or '')

        if 'email' in self.validated_data:
            user.email = self.validated_data.get('email') or None
        user.save()

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class DriverStatsSerializer(serializers.Serializer):
    """Driver Statistics Serializer"""

    total_trips = serializers.IntegerField()
    total_km = serializers.FloatField()
    total_advance = serializers.FloatField()
    base_salary = serializers.FloatField()
