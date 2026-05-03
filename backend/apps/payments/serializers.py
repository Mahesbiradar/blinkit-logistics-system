"""
VehicleSettlement Serializers
"""
from rest_framework import serializers

from apps.vehicles.models import Vehicle
from .models import VehicleSettlement

READONLY_COMPUTED = [
    'total_expenses', 'gross_amount', 'carry_forward_from_previous',
    'balance_payable', 'status', 'paid_amount', 'paid_at', 'paid_by',
    'created_at', 'updated_at',
]


class VehicleSettlementSerializer(serializers.ModelSerializer):
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    paid_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VehicleSettlement
        fields = [
            'id', 'vehicle', 'vehicle_number', 'month_year',
            'total_days', 'working_days', 'working_days_manual', 'total_km', 'total_km_manual',
            'base_amount', 'absent_penalty_days', 'absent_penalty_amount', 'extra_km_amount',
            'total_expenses', 'gross_amount',
            'carry_forward_from_previous', 'balance_payable',
            'status', 'status_display',
            'paid_amount', 'paid_at', 'paid_by', 'paid_by_name',
            'payment_mode', 'transaction_reference', 'remarks',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id'] + READONLY_COMPUTED

    def get_paid_by_name(self, obj):
        return obj.paid_by.get_full_name() if obj.paid_by else None


class VehicleSettlementCreateSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        source='vehicle',
        queryset=Vehicle.objects.filter(is_active=True),
        write_only=True,
    )

    class Meta:
        model = VehicleSettlement
        fields = [
            'vehicle_id', 'month_year',
            'total_days', 'working_days', 'working_days_manual', 'total_km', 'total_km_manual',
            'base_amount', 'absent_penalty_days', 'absent_penalty_amount',
            'extra_km_amount', 'remarks',
        ]

    def validate(self, data):
        vehicle = data.get('vehicle')
        month_year = data.get('month_year')
        if VehicleSettlement.objects.filter(vehicle=vehicle, month_year=month_year).exists():
            raise serializers.ValidationError(
                "A settlement already exists for this vehicle and month."
            )
        working = data.get('working_days', 0)
        total = data.get('total_days', 0)
        if working > total:
            raise serializers.ValidationError({'working_days': 'working_days cannot exceed total_days.'})
        return data

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class VehicleSettlementPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleSettlement
        fields = [
            'total_days', 'working_days', 'working_days_manual', 'total_km', 'total_km_manual',
            'base_amount', 'absent_penalty_days', 'absent_penalty_amount',
            'extra_km_amount', 'remarks',
        ]

    def validate(self, data):
        instance = self.instance
        if instance and instance.status != 'draft':
            raise serializers.ValidationError("Only draft settlements can be edited.")
        working = data.get('working_days', getattr(instance, 'working_days', 0))
        total = data.get('total_days', getattr(instance, 'total_days', 0))
        if working > total:
            raise serializers.ValidationError({'working_days': 'working_days cannot exceed total_days.'})
        return data


class MarkPaidSerializer(serializers.Serializer):
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = serializers.ChoiceField(
        choices=['phonepay', 'kiwi', 'amazon_pay', 'whatsapp', 'cash', 'bank_transfer', 'other']
    )
    transaction_reference = serializers.CharField(required=False, allow_blank=True)

    def validate_paid_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("paid_amount must be greater than 0.")
        return value


class VehicleSettlementSummarySerializer(serializers.ModelSerializer):
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = VehicleSettlement
        fields = [
            'id', 'vehicle', 'vehicle_number', 'month_year',
            'gross_amount', 'total_expenses', 'balance_payable',
            'status', 'status_display',
        ]
