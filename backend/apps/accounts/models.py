"""
Accounts Models - User Management
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User Model supporting phone-based authentication for drivers"""
    
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('coordinator', 'Coordinator'),
        ('driver', 'Driver'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=15, unique=True)
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['first_name', 'role']
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.first_name} ({self.phone})"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name or ''}".strip()
    
    def get_short_name(self):
        return self.first_name
    
    def is_owner(self):
        return self.role == 'owner'
    
    def is_coordinator(self):
        return self.role == 'coordinator'
    
    def is_driver_role(self):
        return self.role == 'driver'
    
    def update_last_login(self):
        self.last_login_at = timezone.now()
        self.save(update_fields=['last_login_at'])


class OTPCode(models.Model):
    """OTP Codes for phone authentication"""
    
    PURPOSE_CHOICES = [
        ('login', 'Login'),
        ('password_reset', 'Password Reset'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=15, db_index=True)
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='login')
    
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempt_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'otp_codes'
        ordering = ['-created_at']
        verbose_name = 'OTP Code'
        verbose_name_plural = 'OTP Codes'
    
    def __str__(self):
        return f"OTP for {self.phone}"
    
    def is_valid(self):
        """Check if OTP is still valid"""
        return not self.is_used and self.expires_at > timezone.now()
    
    def mark_used(self):
        """Mark OTP as used"""
        self.is_used = True
        self.save(update_fields=['is_used'])
    
    def increment_attempt(self):
        """Increment attempt count"""
        self.attempt_count += 1
        self.save(update_fields=['attempt_count'])
