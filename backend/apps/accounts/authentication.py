"""
JWT Authentication
"""
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    """JWT Token Authentication"""
    
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return None
        
        try:
            # Extract token from "Bearer <token>"
            prefix, token = auth_header.split(' ')
            if prefix.lower() != 'bearer':
                return None
        except ValueError:
            return None
        
        try:
            # Decode token
            payload = jwt.decode(
                token,
                settings.JWT_SETTINGS['SIGNING_KEY'],
                algorithms=[settings.JWT_SETTINGS['ALGORITHM']]
            )
            
            # Check token type
            if payload.get('type') != 'access':
                raise exceptions.AuthenticationFailed('Invalid token type')
            
            # Get user
            user = User.objects.get(id=payload['user_id'], is_active=True)
            
            return (user, None)
            
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found')
    
    def authenticate_header(self, request):
        return 'Bearer'
