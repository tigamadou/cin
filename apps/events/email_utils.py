# apps/events/email_utils.py
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.conf import settings
from .models import EventSettings
from .email_config import get_email_config
import logging

logger = logging.getLogger(__name__)


def send_participant_invitation_email(participant, qr_bytes=None):
    """
    Send invitation email to participant with QR code displayed inline.
    
    Args:
        participant: Participant instance
        qr_bytes: Optional QR code image bytes
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Convert QR bytes to base64 for inline display
        qr_base64 = None
        if qr_bytes:
            import base64
            qr_base64 = base64.b64encode(qr_bytes).decode('utf-8')
        
        # Get event settings
        event_settings = EventSettings.get_solo()
        
        # Prepare context for template
        context = {
            'participant': participant,
            'is_update': False,
            'qr_base64': qr_base64,
            'event_name': event_settings.event_name,
            'event_description': event_settings.event_description,
            'venue': event_settings.venue,
            'start_date': event_settings.start_date,
            'end_date': event_settings.end_date,
            'logo_url': f"{settings.API_DOMAIN}{event_settings.logo.url}" if event_settings.logo else None,
        }
        
        # Render email templates
        try:
            html_content = render_to_string('emails/participant_invitation.html', context)
            text_content = render_to_string('emails/participant_invitation.txt', context)
            logger.debug(f"Email templates loaded successfully for {participant.email}")
        except Exception as template_error:
            logger.error(f"Template rendering error for {participant.email}: {template_error}", exc_info=True)
            # Fallback to simple text email
            html_content = f"""
            <html>
            <body>
                <h1>Invitation à l'événement</h1>
                <p>Bonjour {participant.first_name},</p>
                <p>Vous êtes invité(e) à participer à notre événement !</p>
                <p>Votre billet d'entrée est en pièce jointe.</p>
            </body>
            </html>
            """
            text_content = f"""
            Invitation à l'événement
            
            Bonjour {participant.first_name},
            
            Vous êtes invité(e) à participer à notre événement !
            Votre billet d'entrée est en pièce jointe.
            """
        
        # Create email subject
        event_type = participant.event_type or "l'événement"
        subject = f'🎉 Invitation à {event_type} - Votre billet QR code'
        
        # Get email configuration (database settings take precedence)
        email_config = get_email_config()
        
        # Create email connection with current configuration
        connection = get_connection(
            host=email_config['EMAIL_HOST'],
            port=email_config['EMAIL_PORT'],
            username=email_config['EMAIL_HOST_USER'],
            password=email_config['EMAIL_HOST_PASSWORD'],
            use_tls=email_config['EMAIL_USE_TLS'],
            use_ssl=email_config['EMAIL_USE_SSL'],
            fail_silently=False
        )
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=email_config['DEFAULT_FROM_EMAIL'],
            to=[participant.email],
            connection=connection
        )
        
        # Attach HTML version
        email.attach_alternative(html_content, "text/html")
        
        # QR code is now displayed inline in the email, no attachment needed
        
        # Send email
        email.send(fail_silently=False)
        
        logger.info(f"Invitation email sent successfully to {participant.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send invitation email to {participant.email}: {str(e)}")
        return False


def send_participant_update_email(participant, qr_bytes=None):
    """
    Send update notification email to participant.
    
    Args:
        participant: Participant instance
        qr_bytes: Optional QR code image bytes
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Convert QR bytes to base64 for inline display
        qr_base64 = None
        if qr_bytes:
            import base64
            qr_base64 = base64.b64encode(qr_bytes).decode('utf-8')
        
        # Get event settings
        event_settings = EventSettings.get_solo()
        
        # Prepare context for template
        context = {
            'participant': participant,
            'is_update': True,
            'qr_base64': qr_base64,
            'event_name': event_settings.event_name,
            'event_description': event_settings.event_description,
            'venue': event_settings.venue,
            'start_date': event_settings.start_date,
            'end_date': event_settings.end_date,
            'logo_url': f"{settings.API_DOMAIN}{event_settings.logo.url}" if event_settings.logo else None,
        }
        
        # Render email templates
        try:
            html_content = render_to_string('emails/participant_invitation.html', context)
            text_content = render_to_string('emails/participant_invitation.txt', context)
            logger.debug(f"Email templates loaded successfully for {participant.email}")
        except Exception as template_error:
            logger.error(f"Template rendering error for {participant.email}: {template_error}", exc_info=True)
            # Fallback to simple text email
            html_content = f"""
            <html>
            <body>
                <h1>Mise à jour de votre invitation</h1>
                <p>Bonjour {participant.first_name},</p>
                <p>Vos informations de participation ont été mises à jour !</p>
                <p>Votre billet d'entrée mis à jour est en pièce jointe.</p>
            </body>
            </html>
            """
            text_content = f"""
            Mise à jour de votre invitation
            
            Bonjour {participant.first_name},
            
            Vos informations de participation ont été mises à jour !
            Votre billet d'entrée mis à jour est en pièce jointe.
            """
        
        # Create email subject
        event_type = participant.event_type or "l'événement"
        subject = f'📝 Mise à jour de votre invitation à {event_type}'
        
        # Get email configuration (database settings take precedence)
        email_config = get_email_config()
        
        # Create email connection with current configuration
        connection = get_connection(
            host=email_config['EMAIL_HOST'],
            port=email_config['EMAIL_PORT'],
            username=email_config['EMAIL_HOST_USER'],
            password=email_config['EMAIL_HOST_PASSWORD'],
            use_tls=email_config['EMAIL_USE_TLS'],
            use_ssl=email_config['EMAIL_USE_SSL'],
            fail_silently=False
        )
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=email_config['DEFAULT_FROM_EMAIL'],
            to=[participant.email],
            connection=connection
        )
        
        # Attach HTML version
        email.attach_alternative(html_content, "text/html")
        
        # QR code is now displayed inline in the email, no attachment needed
        
        # Send email
        email.send(fail_silently=False)
        
        logger.info(f"Update email sent successfully to {participant.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send update email to {participant.email}: {str(e)}")
        return False
