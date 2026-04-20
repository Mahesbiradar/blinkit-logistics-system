"""
Expenses Serializers
"""
from django.utils import timezone
from rest_framework import serializers

from apps.drivers.models import Driver
from apps.trips.models import Trip
from apps.vehicles.models import Vehicle
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    """Expense Serializer"""

    driver = serializers.SerializerMethodField()
    vehicle = serializers.SerializerMethodField()
    trip_id = serializers.UUIDField(source='trip.id', read_only=True, allow_null=True)
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'driver', 'vehicle',
            'trip_id', 'expense_type', 'expense_type_display',
            'amount', 'expense_date', 'description',
            'receipt_image_url', 'payment_mode', 'payment_mode_display',
            'is_blinkit_reimbursable',
            'is_deducted', 'deducted_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_deducted', 'deducted_at', 'created_at', 'updated_at']

    def _build_absolute_uri(self, file_field):
        request = self.context.get('request')
        if not file_field:
            return None
        if request:
            return request.build_absolute_uri(file_field.url)
        return file_field.url

    def get_driver(self, obj):
        if not obj.driver:
            return None
        return {
            'id': str(obj.driver.id),
            'name': obj.driver.user.get_full_name(),
            'phone': obj.driver.user.phone,
        }

    def get_vehicle(self, obj):
        if not obj.vehicle:
            return None
        return {
            'id': str(obj.vehicle.id),
            'vehicle_number': obj.vehicle.vehicle_number,
            'vehicle_type': obj.vehicle.vehicle_type,
        }

    def get_receipt_image_url(self, obj):
        return self._build_absolute_uri(obj.receipt_image)


class ExpenseWriteSerializer(serializers.ModelSerializer):
    """Expense create/update serializer"""

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
    trip_id = serializers.PrimaryKeyRelatedField(
        source='trip',
        queryset=Trip.objects.none(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    receipt_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = [
            'driver_id', 'vehicle_id', 'trip_id', 'expense_type',
            'amount', 'expense_date', 'description',
            'receipt_image', 'payment_mode', 'is_blinkit_reimbursable'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['driver_id'].queryset = Driver.objects.select_related('user').filter(is_active=True)
        self.fields['vehicle_id'].queryset = Vehicle.objects.filter(is_active=True)
        self.fields['trip_id'].queryset = Trip.objects.all()

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value

    def validate(self, data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        instance = getattr(self, 'instance', None)

        if data.get('expense_date') and data['expense_date'] > timezone.now().date():
            raise serializers.ValidationError({
                'expense_date': 'Expense date cannot be in the future'
            })

        driver = data.get('driver', getattr(instance, 'driver', None))
        vehicle = data.get('vehicle', getattr(instance, 'vehicle', None))
        trip = data.get('trip', getattr(instance, 'trip', None))

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required")

        expense_type = data.get('expense_type', '')
        is_company_expense = expense_type == 'company_management'

        # Auto-set toll reimbursable flag
        if expense_type == 'toll':
            data['is_blinkit_reimbursable'] = True

        if user.is_driver_role():
            if not hasattr(user, 'driver_profile'):
                raise serializers.ValidationError("Driver profile not found")
            if is_company_expense:
                raise serializers.ValidationError(
                    "Drivers cannot create company/management expenses"
                )
            driver = user.driver_profile
            if vehicle is None:
                vehicle = driver.get_primary_vehicle()
            if vehicle is None:
                raise serializers.ValidationError({
                    'vehicle_id': 'No vehicle assigned to driver'
                })
            has_assignment = driver.vehicle_mappings.filter(
                vehicle=vehicle, unassigned_at__isnull=True,
            ).exists()
            if not has_assignment:
                raise serializers.ValidationError({
                    'vehicle_id': 'Vehicle is not assigned to this driver'
                })
        elif user.is_owner() or user.is_coordinator():
            if is_company_expense:
                # Company/management expenses don't need driver or vehicle
                data['driver'] = None
                data['vehicle'] = None
                return data
            if driver is None:
                raise serializers.ValidationError({'driver_id': 'Driver is required'})
            if vehicle is None:
                raise serializers.ValidationError({'vehicle_id': 'Vehicle is required'})
            has_assignment = driver.vehicle_mappings.filter(
                vehicle=vehicle, unassigned_at__isnull=True,
            ).exists()
            if not has_assignment:
                raise serializers.ValidationError({
                    'vehicle_id': 'Vehicle is not assigned to the selected driver'
                })
        else:
            raise serializers.ValidationError("You do not have permission to create expenses")

        if trip:
            if trip.driver_id != driver.id:
                raise serializers.ValidationError({
                    'trip_id': 'Trip does not belong to the selected driver'
                })
            if trip.vehicle_id != vehicle.id:
                raise serializers.ValidationError({
                    'trip_id': 'Trip does not belong to the selected vehicle'
                })

        data['driver'] = driver
        data['vehicle'] = vehicle
        return data


class ExpenseListSerializer(serializers.ModelSerializer):
    """Expense List Serializer (minimal fields)"""

    driver_name = serializers.SerializerMethodField()
    vehicle_number = serializers.SerializerMethodField()
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'driver_name', 'vehicle_number',
            'expense_type', 'expense_type_display',
            'amount', 'expense_date', 'is_deducted', 'is_blinkit_reimbursable'
        ]

    def get_driver_name(self, obj):
        return obj.driver.user.get_full_name() if obj.driver else '—'

    def get_vehicle_number(self, obj):
        return obj.vehicle.vehicle_number if obj.vehicle else '—'


class ExpenseSummarySerializer(serializers.Serializer):
    """Expense Summary Serializer"""

    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_type = serializers.DictField()
    by_month = serializers.ListField(required=False)


class ExpenseFilterSerializer(serializers.Serializer):
    """Expense Filter Serializer"""

    driver_id = serializers.UUIDField(required=False)
    vehicle_id = serializers.UUIDField(required=False)
    expense_type = serializers.ChoiceField(
        choices=['fuel', 'toll', 'advance', 'allowance', 'maintenance', 'other', 'company_management'],
        required=False
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    is_deducted = serializers.BooleanField(required=False)


class DriverExpenseSummarySerializer(serializers.Serializer):
    """Driver Expense Summary Serializer"""

    advance_taken = serializers.DecimalField(max_digits=12, decimal_places=2)
    advance_deducted = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining_advance = serializers.DecimalField(max_digits=12, decimal_places=2)
