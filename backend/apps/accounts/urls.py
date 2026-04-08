"""
Accounts URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('otp/send/', views.SendOTPView.as_view(), name='send-otp'),
    path('otp/verify/', views.VerifyOTPView.as_view(), name='verify-otp'),
    path('driver/register/', views.DriverRegisterView.as_view(), name='driver-register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', views.TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
]
