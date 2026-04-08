"""
Expenses Serializers
"""
from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    """Expense Serializer"""
    
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    receipt_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = [
            'id', 'driver', 'driver_name', 'vehicle', 'vehicle_number',
            'trip', 'expense_type', 'expense_type_display',
            'amount', 'expense_date', 'description',
            'receipt_image_url', 'payment_mode', 'payment_mode_display',
            'is_deducted', 'deducted_at',
            'created_at'
        ]
        read_only_fields = ['id', 'is_deducted', 'deducted_at', 'created_at']
    
    def get_receipt_image_url(self, obj):
        if obj.receipt_image:
            return self.context['request'].build_absolute_uri(obj.receipt_image.url)
        return None


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Expense Create Serializer"""
    
    receipt_image = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Expense
        fields = [
            'driver', 'vehicle', 'trip', 'expense_type',
            'amount', 'expense_date', 'description',
            'receipt_image', 'payment_mode'
        ]
    
    def validate_amount(self, value):
        """Validate amount"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value
    
    def validate(self, data):
        """Validate expense data"""
        # Expense date cannot be in the future
        from django.utils import timezone
        if data.get('expense_date') and data['expense_date'] > timezone.now().date():
            raise serializers.ValidationError({
                'expense_date': 'Expense date cannot be in the future'
            })
        
        return data


class ExpenseListSerializer(serializers.ModelSerializer):
    """Expense List Serializer (minimal fields)"""
    
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id', 'driver_name', 'vehicle_number',
            'expense_type', 'expense_type_display',
            'amount', 'expense_date', 'is_deducted'
        ]


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
        choices=['fuel', 'toll', 'advance', 'allowance', 'maintenance', 'other'],
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
