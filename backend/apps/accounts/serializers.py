"""
Accounts Serializers
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OTPCode

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """User Serializer"""
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone', 'first_name', 'last_name',
            'full_name', 'role', 'is_active', 'last_login_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'last_login_at']


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal User Serializer"""
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'phone']


class SendOTPSerializer(serializers.Serializer):
    """Serializer for sending OTP"""
    phone = serializers.CharField(max_length=15, required=True)
    
    def validate_phone(self, value):
        """Validate phone number"""
        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")
        return phone


class VerifyOTPSerializer(serializers.Serializer):
    """Serializer for verifying OTP"""
    phone = serializers.CharField(max_length=15, required=True)
    otp = serializers.CharField(max_length=6, required=True)
    
    def validate_phone(self, value):
        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")
        return phone
    
    def validate_otp(self, value):
        if len(value) != 6 or not value.isdigit():
            raise serializers.ValidationError("OTP must be 6 digits")
        return value


class LoginSerializer(serializers.Serializer):
    """Serializer for email/password login"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class ForgotPasswordRequestSerializer(serializers.Serializer):
    """Request password reset OTP"""

    phone = serializers.CharField(max_length=15, required=True)

    def validate_phone(self, value):
        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")

        user = User.objects.filter(phone=phone, role__in=['owner', 'coordinator'], is_active=True).first()
        if not user:
            raise serializers.ValidationError("No active admin account found for this phone number")
        return phone


class ResetPasswordSerializer(serializers.Serializer):
    """Reset password using OTP"""

    phone = serializers.CharField(max_length=15, required=True)
    otp = serializers.CharField(max_length=6, required=True)
    new_password = serializers.CharField(min_length=8, write_only=True, required=True)

    def validate_phone(self, value):
        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")
        return phone

    def validate_otp(self, value):
        if len(value) != 6 or not value.isdigit():
            raise serializers.ValidationError("OTP must be 6 digits")
        return value

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters")
        return value


class CoordinatorCreateSerializer(serializers.Serializer):
    """Create coordinator serializer"""

    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=15, required=True)
    password = serializers.CharField(min_length=8, write_only=True, required=True)

    def validate_phone(self, value):
        phone = ''.join(filter(str.isdigit, value))
        if len(phone) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits")
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Phone number already registered")
        return phone

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Email already registered")
        return normalized

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters")
        return value


class DriverRegistrationSerializer(serializers.Serializer):
    """Serializer for driver registration"""
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    vehicle_id = serializers.UUIDField(required=True)


class ProfileUpdateSerializer(serializers.Serializer):
    """Update own profile (name / email)"""
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)

    def validate_email(self, value):
        normalized = value.lower().strip()
        user = self.context['request'].user
        if User.objects.filter(email__iexact=normalized).exclude(id=user.id).exists():
            raise serializers.ValidationError("Email already in use by another account")
        return normalized


class PasswordChangeSerializer(serializers.Serializer):
    """Change own password (owner / coordinator only)"""
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(min_length=8, required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return data


class DriverProfileUpdateSerializer(serializers.Serializer):
    """Update driver-specific profile fields"""
    license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_expiry = serializers.DateField(required=False, allow_null=True)
    aadhar_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    emergency_contact = serializers.CharField(max_length=15, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)


class TokenResponseSerializer(serializers.Serializer):
    """Serializer for token response"""
    access = serializers.CharField()
    refresh = serializers.CharField()


class AuthResponseSerializer(serializers.Serializer):
    """Serializer for authentication response"""
    user = UserSerializer()
    tokens = TokenResponseSerializer()
    driver_profile = serializers.DictField(required=False, allow_null=True)
    is_new_user = serializers.BooleanField(required=False)
