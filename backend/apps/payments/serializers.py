"""
Payments Serializers
"""
from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """Payment Serializer"""
    
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    paid_by_name = serializers.CharField(source='paid_by.get_full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'driver', 'driver_name', 'vehicle', 'vehicle_number',
            'vendor', 'vendor_name', 'payment_type', 'payment_type_display',
            'month_year', 'total_trips', 'total_km', 'km_rate', 'km_amount',
            'base_salary', 'total_fuel_expenses', 'total_advance',
            'total_toll_expenses', 'total_allowance', 'other_deductions',
            'gross_amount', 'total_deductions', 'final_amount',
            'status', 'status_display', 'paid_at', 'paid_by', 'paid_by_name',
            'payment_mode', 'transaction_reference', 'remarks',
            'created_at'
        ]
        read_only_fields = [
            'id', 'km_amount', 'gross_amount', 'total_deductions',
            'final_amount', 'paid_at', 'paid_by', 'created_at'
        ]


class PaymentListSerializer(serializers.ModelSerializer):
    """Payment List Serializer (minimal fields)"""
    
    recipient_name = serializers.SerializerMethodField()
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'recipient_name', 'vehicle_number',
            'payment_type', 'month_year', 'final_amount', 'status'
        ]
    
    def get_recipient_name(self, obj):
        if obj.driver:
            return obj.driver.user.get_full_name()
        elif obj.vendor:
            return obj.vendor.name
        return 'Unknown'


class PaymentCreateSerializer(serializers.Serializer):
    """Payment Create Serializer"""
    
    driver_id = serializers.UUIDField(required=False)
    vendor_id = serializers.UUIDField(required=False)
    vehicle_id = serializers.UUIDField(required=False)
    month_year = serializers.DateField(required=True)
    payment_mode = serializers.CharField(required=False, allow_blank=True)
    transaction_reference = serializers.CharField(required=False, allow_blank=True)
    remarks = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate payment data"""
        driver_id = data.get('driver_id')
        vendor_id = data.get('vendor_id')
        
        if not driver_id and not vendor_id:
            raise serializers.ValidationError(
                "Either driver_id or vendor_id must be provided"
            )
        
        return data


class PaymentCalculationSerializer(serializers.Serializer):
    """Payment Calculation Response Serializer"""
    
    driver_id = serializers.UUIDField(required=False)
    driver_name = serializers.CharField(required=False)
    vendor_id = serializers.UUIDField(required=False)
    vendor_name = serializers.CharField(required=False)
    vehicle = serializers.DictField()
    month_year = serializers.DateField()
    
    total_trips = serializers.IntegerField()
    total_km = serializers.DecimalField(max_digits=10, decimal_places=2)
    km_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    km_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    base_salary = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_fuel_expenses = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_advance = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_toll_expenses = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_allowance = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    gross_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_deductions = serializers.DecimalField(max_digits=10, decimal_places=2)
    final_amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class PaymentMarkPaidSerializer(serializers.Serializer):
    """Payment Mark Paid Serializer"""
    
    payment_mode = serializers.ChoiceField(
        choices=['cash', 'phonepay', 'gpay', 'paytm', 'upi', 'card', 'bank_transfer'],
        required=True
    )
    transaction_reference = serializers.CharField(required=False, allow_blank=True)


class PaymentFilterSerializer(serializers.Serializer):
    """Payment Filter Serializer"""
    
    driver_id = serializers.UUIDField(required=False)
    vehicle_id = serializers.UUIDField(required=False)
    vendor_id = serializers.UUIDField(required=False)
    month_year = serializers.DateField(required=False)
    status = serializers.ChoiceField(
        choices=['pending', 'processed', 'paid'],
        required=False
    )
    payment_type = serializers.ChoiceField(
        choices=['salary', 'vendor_payment', 'advance', 'reimbursement'],
        required=False
    )
