"""
URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/trips/', include('apps.trips.urls')),
    path('api/v1/drivers/', include('apps.drivers.urls')),
    path('api/v1/vehicles/', include('apps.vehicles.urls')),
    path('api/v1/expenses/', include('apps.expenses.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/dashboard/', include('apps.dashboard.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
