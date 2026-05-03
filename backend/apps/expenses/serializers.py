"""
Expenses Serializers — Expense, FastagRecord, CompanyExpense
"""
from datetime import date

from django.utils import timezone
from rest_framework import serializers

from apps.vehicles.models import Vehicle
from .models import CompanyExpense, Expense, FastagRecord


# ── Expense ──────────────────────────────────────────────────────────────────

class ExpenseSerializer(serializers.ModelSerializer):
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'vehicle', 'vehicle_number',
            'expense_date', 'expense_time',
            'expense_type', 'expense_type_display',
            'amount', 'payment_mode', 'payment_mode_display',
            'paid_to_name', 'paid_to_number',
            'month_year', 'remarks', 'receipt_image_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'month_year', 'created_at', 'updated_at']

    def get_receipt_image_url(self, obj):
        if not obj.receipt_image:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.receipt_image.url) if request else obj.receipt_image.url


class ExpenseWriteSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        source='vehicle',
        queryset=Vehicle.objects.filter(is_active=True),
        write_only=True,
    )
    receipt_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = [
            'vehicle_id', 'expense_date', 'expense_time',
            'expense_type', 'amount', 'payment_mode',
            'paid_to_name', 'paid_to_number', 'remarks', 'receipt_image',
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate_expense_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Expense date cannot be in the future.")
        return value

    def _derive_month_year(self, expense_date):
        return date(expense_date.year, expense_date.month, 1)

    def create(self, validated_data):
        validated_data['month_year'] = self._derive_month_year(validated_data['expense_date'])
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'expense_date' in validated_data:
            validated_data['month_year'] = self._derive_month_year(validated_data['expense_date'])
        return super().update(instance, validated_data)


# ── FastagRecord ──────────────────────────────────────────────────────────────

class FastagRecordSerializer(serializers.ModelSerializer):
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    previous_remaining = serializers.DecimalField(
        source='opening_balance', max_digits=10, decimal_places=2, read_only=True,
    )
    recharge_amount = serializers.DecimalField(
        source='fastag_recharged_amount', max_digits=10, decimal_places=2, read_only=True,
    )
    used_amount = serializers.DecimalField(
        source='fastag_debited_amount', max_digits=10, decimal_places=2,
    )
    remaining = serializers.DecimalField(
        source='closing_balance', max_digits=10, decimal_places=2, read_only=True,
    )
    statement_image_url = serializers.SerializerMethodField()

    class Meta:
        model = FastagRecord
        fields = [
            'id', 'vehicle', 'vehicle_number', 'month_year',
            'previous_remaining',
            'recharge_amount',
            'used_amount',
            'remaining',
            'statement_image',
            'statement_image_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'previous_remaining', 'recharge_amount',
            'remaining', 'created_at', 'updated_at',
        ]

    def get_statement_image_url(self, obj):
        if not obj.statement_image:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.statement_image.url) if request else obj.statement_image.url


class FastagRecordCreateSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        source='vehicle',
        queryset=Vehicle.objects.filter(is_active=True),
        write_only=True,
    )

    class Meta:
        model = FastagRecord
        fields = ['vehicle_id', 'month_year', 'opening_balance']

    def validate(self, data):
        vehicle = data.get('vehicle')
        month_year = data.get('month_year')
        if FastagRecord.objects.filter(vehicle=vehicle, month_year=month_year).exists():
            raise serializers.ValidationError(
                "A Fastag record already exists for this vehicle and month."
            )
        # opening_balance is only editable for the very first record for this vehicle
        has_prior = FastagRecord.objects.filter(vehicle=vehicle).exists()
        if has_prior and data.get('opening_balance', 0) != 0:
            raise serializers.ValidationError(
                "opening_balance can only be set on the first record for a vehicle. "
                "Subsequent months inherit from closing_balance via mark-closed."
            )
        return data

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class FastagRecordPatchSerializer(serializers.ModelSerializer):
    used_amount = serializers.DecimalField(
        source='fastag_debited_amount', max_digits=10, decimal_places=2, required=False,
    )
    statement_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = FastagRecord
        fields = ['used_amount', 'statement_image']

    def validate_used_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Fastag used amount cannot be negative.")
        return value

    def update(self, instance, validated_data):
        if instance.status == 'closed':
            raise serializers.ValidationError("Closed Fastag records cannot be edited.")
        if 'fastag_debited_amount' in validated_data:
            instance.statement_submitted_at = timezone.now()
        instance.updated_by = self.context['request'].user
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ── CompanyExpense ────────────────────────────────────────────────────────────

class CompanyExpenseSerializer(serializers.ModelSerializer):
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanyExpense
        fields = [
            'id', 'expense_date', 'expense_time',
            'expense_type', 'expense_type_display',
            'amount', 'payment_mode', 'payment_mode_display',
            'paid_to_name', 'paid_to_number',
            'month_year', 'remarks', 'receipt_image_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'month_year', 'created_at', 'updated_at']

    def get_receipt_image_url(self, obj):
        if not obj.receipt_image:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.receipt_image.url) if request else obj.receipt_image.url


class CompanyExpenseWriteSerializer(serializers.ModelSerializer):
    receipt_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = CompanyExpense
        fields = [
            'expense_date', 'expense_time',
            'expense_type', 'amount', 'payment_mode',
            'paid_to_name', 'paid_to_number', 'remarks', 'receipt_image',
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate_expense_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Expense date cannot be in the future.")
        return value

    def _derive_month_year(self, expense_date):
        return date(expense_date.year, expense_date.month, 1)

    def create(self, validated_data):
        validated_data['month_year'] = self._derive_month_year(validated_data['expense_date'])
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'expense_date' in validated_data:
            validated_data['month_year'] = self._derive_month_year(validated_data['expense_date'])
        return super().update(instance, validated_data)
