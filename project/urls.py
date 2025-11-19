from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    # Serve API routes under /api/ prefix (for main domain and development)
    path('api/', include('apps.events.urls')),
    # Also serve API routes at root level (for api.cin2025.bj subdomain)
    # This allows api.cin2025.bj/current_user/ to work
    # The events URLs are specific enough (current_user/, csrf/, etc.) that they won't conflict with admin/
    path('', include('apps.events.urls')),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
