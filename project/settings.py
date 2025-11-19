import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url
import pymysql

# Configure PyMySQL to work with Django
pymysql.install_as_MySQLdb()

load_dotenv()


BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'apps.events',
]
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


ROOT_URLCONF = 'project.urls'


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'project.wsgi.application'
DATABASE_URL = os.getenv('DATABASE_URL', '')
if DATABASE_URL:
    # Parse MySQL URL (mysql://user:password@host:port/database)
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL)}
else:
    # Fallback to MySQL if no DATABASE_URL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('MYSQL_DATABASE', 'cin_db'),
            'USER': os.getenv('MYSQL_USER', 'cin_user'),
            'PASSWORD': os.getenv('MYSQL_PASSWORD', 'cin_password'),
            'HOST': os.getenv('MYSQL_HOST', 'mysql'),
            'PORT': os.getenv('MYSQL_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }


AUTH_PASSWORD_VALIDATORS = []


LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'frontend' / 'static',
]
TEMPLATES[0]["DIRS"] = [BASE_DIR / "templates", BASE_DIR / "frontend"]
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ]
}
# Email config
EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '1025'))  # Default to 1025 for MailHog in dev
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'False') == 'True'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False') == 'True'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'no-reply@example.com')

# App domain for generating absolute URLs
APP_DOMAIN = os.getenv('APP_DOMAIN', 'http://localhost:8000')
API_DOMAIN = os.getenv('API_DOMAIN', 'http://localhost:8000')


# CORS_ALLOW_ALL_ORIGINS = True
# si tu utilises django-cors-headers:
CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOWED_ORIGINS = [
#     "http://127.0.0.1:5173",  # Vite
#     "http://localhost:5173",
# ]
# si tu utilises proxy (vite -> django) et front dans Docker, ajuste en conséquence

CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if origin.strip()]
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if origin.strip()]

# cookies (optionnel)
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
# en dev tu peux garder secure=False; en prod secure=True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Cookie domain for cross-subdomain support (e.g., cin2025.bj and api.cin2025.bj)
# Set to .domain.com to allow cookies across all subdomains
CSRF_COOKIE_DOMAIN = os.getenv('CSRF_COOKIE_DOMAIN', None)  # None = current domain only
SESSION_COOKIE_DOMAIN = os.getenv('SESSION_COOKIE_DOMAIN', None)  # None = current domain only
