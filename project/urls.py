from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.urls import re_path


urlpatterns = [
    path('admin/', admin.site.urls),
    # Serve API routes under /api/ prefix (for main domain and development)
    path('api/', include('apps.events.urls')),
    # Also serve API routes at root level (for api.cin2025.bj subdomain)
    # This allows api.cin2025.bj/current_user/ to work
    # The events URLs are specific enough (current_user/, csrf/, etc.) that they won't conflict with admin/
    path('', include('apps.events.urls')),
]

# Serve media files in both DEBUG and production
# In production, this allows media files to be served through Django/Gunicorn
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

# Serve static files in DEBUG mode (in production, use WhiteNoise or reverse proxy)
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,
                          document_root=settings.STATIC_ROOT)
