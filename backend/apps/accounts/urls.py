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
    path('password/forgot/', views.ForgotPasswordRequestView.as_view(), name='forgot-password'),
    path('password/reset/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('coordinators/', views.CoordinatorCreateView.as_view(), name='coordinator-create'),
    path('token/refresh/', views.TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
]
