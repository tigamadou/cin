# apps/events/email_config.py
"""
Helper functions to get email configuration from database or environment variables.
Database settings take precedence over environment variables.
"""
import os
from django.conf import settings
from .models import EventSettings
import logging

logger = logging.getLogger(__name__)


def get_email_config():
    """
    Get email configuration, prioritizing database settings over environment variables.
    
    Returns:
        dict: Email configuration with keys:
            - EMAIL_HOST
            - EMAIL_PORT
            - EMAIL_HOST_USER
            - EMAIL_HOST_PASSWORD
            - EMAIL_USE_TLS
            - EMAIL_USE_SSL
            - DEFAULT_FROM_EMAIL
    """
    try:
        event_settings = EventSettings.get_solo()
        
        # Check if SMTP is configured in database
        if event_settings.smtp_host:
            config = {
                'EMAIL_HOST': event_settings.smtp_host,
                'EMAIL_PORT': event_settings.smtp_port or 587,
                'EMAIL_HOST_USER': event_settings.smtp_user or '',
                'EMAIL_HOST_PASSWORD': event_settings.smtp_password or '',
                'EMAIL_USE_TLS': event_settings.smtp_use_tls,
                'EMAIL_USE_SSL': event_settings.smtp_use_ssl,
                'DEFAULT_FROM_EMAIL': event_settings.smtp_from_email or settings.DEFAULT_FROM_EMAIL,
            }
            logger.debug("Using email configuration from database")
            return config
    except Exception as e:
        logger.warning(f"Failed to get email config from database: {e}")
    
    # Fallback to environment variables
    config = {
        'EMAIL_HOST': os.getenv('EMAIL_HOST', ''),
        'EMAIL_PORT': int(os.getenv('EMAIL_PORT', '1025')),
        'EMAIL_HOST_USER': os.getenv('EMAIL_HOST_USER', ''),
        'EMAIL_HOST_PASSWORD': os.getenv('EMAIL_HOST_PASSWORD', ''),
        'EMAIL_USE_TLS': os.getenv('EMAIL_USE_TLS', 'False') == 'True',
        'EMAIL_USE_SSL': os.getenv('EMAIL_USE_SSL', 'False') == 'True',
        'DEFAULT_FROM_EMAIL': os.getenv('DEFAULT_FROM_EMAIL', 'no-reply@example.com'),
    }
    logger.debug("Using email configuration from environment variables")
    return config


def get_email_backend():
    """
    Get the appropriate email backend based on configuration.
    
    Returns:
        str: Email backend class path
    """
    config = get_email_config()
    
    # If no host is configured, use console backend for development
    if not config['EMAIL_HOST']:
        return 'django.core.mail.backends.console.EmailBackend'
    
    # Use SMTP backend
    return 'django.core.mail.backends.smtp.EmailBackend'

