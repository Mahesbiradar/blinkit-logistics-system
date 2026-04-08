"""
Custom User Manager
"""
from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """Custom user manager for phone-based authentication"""
    
    def create_user(self, phone, first_name, role, password=None, **extra_fields):
        """Create and save a regular user"""
        if not phone:
            raise ValueError('Phone number is required')
        if not first_name:
            raise ValueError('First name is required')
        if not role:
            raise ValueError('Role is required')
        
        user = self.model(
            phone=phone,
            first_name=first_name,
            role=role,
            **extra_fields
        )
        
        if password:
            user.set_password(password)
        
        user.save(using=self._db)
        return user
    
    def create_superuser(self, phone, first_name, password=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'owner')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')
        
        return self.create_user(phone, first_name, password=password, **extra_fields)
    
    def get_by_natural_key(self, phone):
        """Get user by phone number"""
        return self.get(phone=phone)
