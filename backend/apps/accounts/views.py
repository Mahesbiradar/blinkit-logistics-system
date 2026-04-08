"""
Accounts Views - Authentication
"""
import random
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, OTPCode
from .serializers import (
    SendOTPSerializer, VerifyOTPSerializer, LoginSerializer,
    DriverRegistrationSerializer, UserSerializer
)


def generate_otp():
    """Generate 6-digit OTP"""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])


def generate_tokens(user):
    """Generate JWT tokens for user"""
    jwt_settings = settings.JWT_SETTINGS
    
    # Access token
    access_payload = {
        'user_id': str(user.id),
        'phone': user.phone,
        'role': user.role,
        'exp': datetime.utcnow() + jwt_settings['ACCESS_TOKEN_LIFETIME'],
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    
    # Refresh token
    refresh_payload = {
        'user_id': str(user.id),
        'exp': datetime.utcnow() + jwt_settings['REFRESH_TOKEN_LIFETIME'],
        'iat': datetime.utcnow(),
        'type': 'refresh'
    }
    
    access_token = jwt.encode(
        access_payload,
        jwt_settings['SIGNING_KEY'],
        algorithm=jwt_settings['ALGORITHM']
    )
    
    refresh_token = jwt.encode(
        refresh_payload,
        jwt_settings['SIGNING_KEY'],
        algorithm=jwt_settings['ALGORITHM']
    )
    
    return {
        'access': access_token,
        'refresh': refresh_token
    }


class SendOTPView(APIView):
    """Send OTP to phone number"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid phone number',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        phone = serializer.validated_data['phone']
        
        # Generate OTP
        otp_code = generate_otp()
        
        # Save OTP
        expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        OTPCode.objects.create(
            phone=phone,
            otp_code=otp_code,
            expires_at=expires_at
        )
        
        # TODO: Integrate with SMS service (Twilio/Fast2SMS)
        # For development, return OTP in response
        return Response({
            'success': True,
            'message': 'OTP sent successfully',
            'data': {
                'phone': phone,
                'expires_in': settings.OTP_EXPIRY_MINUTES * 60,
                'otp': otp_code  # Remove in production
            }
        })


class VerifyOTPView(APIView):
    """Verify OTP and login/register driver"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid input',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        phone = serializer.validated_data['phone']
        otp = serializer.validated_data['otp']
        
        # Find valid OTP
        try:
            otp_record = OTPCode.objects.filter(
                phone=phone,
                otp_code=otp,
                is_used=False,
                expires_at__gt=datetime.utcnow()
            ).latest('created_at')
        except OTPCode.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invalid or expired OTP'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark OTP as used
        otp_record.mark_used()
        
        # Check if user exists
        try:
            user = User.objects.get(phone=phone, role='driver')
            user.update_last_login()
            
            # Generate tokens
            tokens = generate_tokens(user)
            
            # Get driver profile
            driver_profile = None
            if hasattr(user, 'driver_profile'):
                driver = user.driver_profile
                primary_vehicle = driver.get_primary_vehicle()
                driver_profile = {
                    'id': str(driver.id),
                    'license_number': driver.license_number,
                    'primary_vehicle': {
                        'id': str(primary_vehicle.id),
                        'vehicle_number': primary_vehicle.vehicle_number
                    } if primary_vehicle else None
                }
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'data': {
                    'user': UserSerializer(user).data,
                    'tokens': tokens,
                    'driver_profile': driver_profile
                }
            })
            
        except User.DoesNotExist:
            # New user - generate temp token for registration
            temp_payload = {
                'phone': phone,
                'exp': datetime.utcnow() + timedelta(minutes=10),
                'iat': datetime.utcnow(),
                'type': 'registration'
            }
            temp_token = jwt.encode(
                temp_payload,
                settings.JWT_SETTINGS['SIGNING_KEY'],
                algorithm=settings.JWT_SETTINGS['ALGORITHM']
            )
            
            return Response({
                'success': True,
                'message': 'OTP verified. Please complete registration.',
                'data': {
                    'phone': phone,
                    'is_new_user': True,
                    'temp_token': temp_token
                }
            })


class DriverRegisterView(APIView):
    """Complete driver registration"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        from apps.drivers.models import Driver, DriverVehicleMapping
        from apps.vehicles.models import Vehicle
        
        # Verify temp token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({
                'success': False,
                'message': 'Authorization required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        temp_token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(
                temp_token,
                settings.JWT_SETTINGS['SIGNING_KEY'],
                algorithms=[settings.JWT_SETTINGS['ALGORITHM']]
            )
            
            if payload.get('type') != 'registration':
                raise jwt.InvalidTokenError()
            
            phone = payload['phone']
            
        except jwt.ExpiredSignatureError:
            return Response({
                'success': False,
                'message': 'Registration session expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({
                'success': False,
                'message': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Validate registration data
        serializer = DriverRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid input',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Get vehicle
        try:
            vehicle = Vehicle.objects.get(id=data['vehicle_id'], is_active=True)
        except Vehicle.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Vehicle not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Create user
        user = User.objects.create_user(
            phone=phone,
            first_name=data['first_name'],
            last_name=data.get('last_name', ''),
            role='driver'
        )
        
        # Create driver profile
        driver = Driver.objects.create(
            user=user,
            license_number=data.get('license_number', ''),
            base_salary=vehicle.base_salary if vehicle.is_owner_vehicle() else 0
        )
        
        # Assign vehicle
        DriverVehicleMapping.objects.create(
            driver=driver,
            vehicle=vehicle,
            is_primary=True
        )
        
        # Generate tokens
        tokens = generate_tokens(user)
        
        return Response({
            'success': True,
            'message': 'Registration successful',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': tokens,
                'driver_profile': {
                    'id': str(driver.id),
                    'license_number': driver.license_number,
                    'primary_vehicle': {
                        'id': str(vehicle.id),
                        'vehicle_number': vehicle.vehicle_number
                    }
                }
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Admin/Coordinator login with email/password"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid input',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Authenticate user
        try:
            user = User.objects.get(email=email)
            if not user.check_password(password):
                raise User.DoesNotExist()
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check role
        if user.role not in ['owner', 'coordinator']:
            return Response({
                'success': False,
                'message': 'Unauthorized access'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user.update_last_login()
        
        # Generate tokens
        tokens = generate_tokens(user)
        
        return Response({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': tokens
            }
        })


class TokenRefreshView(APIView):
    """Refresh access token"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response({
                'success': False,
                'message': 'Refresh token required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payload = jwt.decode(
                refresh_token,
                settings.JWT_SETTINGS['SIGNING_KEY'],
                algorithms=[settings.JWT_SETTINGS['ALGORITHM']]
            )
            
            if payload.get('type') != 'refresh':
                raise jwt.InvalidTokenError()
            
            user = User.objects.get(id=payload['user_id'])
            
            # Generate new access token
            access_payload = {
                'user_id': str(user.id),
                'phone': user.phone,
                'role': user.role,
                'exp': datetime.utcnow() + settings.JWT_SETTINGS['ACCESS_TOKEN_LIFETIME'],
                'iat': datetime.utcnow(),
                'type': 'access'
            }
            
            access_token = jwt.encode(
                access_payload,
                settings.JWT_SETTINGS['SIGNING_KEY'],
                algorithm=settings.JWT_SETTINGS['ALGORITHM']
            )
            
            return Response({
                'success': True,
                'data': {
                    'access': access_token
                }
            })
            
        except jwt.ExpiredSignatureError:
            return Response({
                'success': False,
                'message': 'Refresh token expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except (jwt.InvalidTokenError, User.DoesNotExist):
            return Response({
                'success': False,
                'message': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(APIView):
    """Get user profile"""
    
    def get(self, request):
        user = request.user
        
        data = {
            'user': UserSerializer(user).data
        }
        
        # Include driver profile if applicable
        if user.is_driver_role() and hasattr(user, 'driver_profile'):
            from apps.drivers.serializers import DriverSerializer
            data['driver_profile'] = DriverSerializer(user.driver_profile).data
        
        return Response({
            'success': True,
            'data': data
        })
