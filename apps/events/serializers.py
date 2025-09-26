# apps/events/serializers.py
import io
import base64
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.db import transaction
from django.utils import timezone

import qrcode
from rest_framework import serializers

from .models import Participant, RegistrationSetting, EventSettings
from .email_utils import send_participant_invitation_email, send_participant_update_email


class QRMixin:
    """Mixin providing helper methods to return QR image as base64 or absolute URL."""

    def get_qr_base64(self, obj):
        try:
            if obj and obj.qr_code:
                with obj.qr_code.open('rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            return None
        return None

    def get_qr_url(self, obj):
        request = self.context.get('request')
        try:
            if obj and obj.qr_code:
                if request is not None:
                    return request.build_absolute_uri(obj.qr_code.url)
                return obj.qr_code.url
        except Exception:
            return None
        return None


class ParticipantSerializer(QRMixin, serializers.ModelSerializer):
    qr_base64 = serializers.SerializerMethodField(read_only=True)
    qr_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Participant
        fields = [
            'id', 'first_name', 'last_name', 'email',
            'phone', 'organization', 'position', 'country', 'event_type',
            'ticket_uuid', 'qr_code', 'created_at',
            'used', 'used_at',
            'qr_base64', 'qr_url',
        ]
        read_only_fields = [
            'id', 'ticket_uuid', 'qr_code',
            'created_at', 'used', 'used_at', 'qr_base64', 'qr_url'
        ]


class ParticipantCreateSerializer(QRMixin, serializers.ModelSerializer):
    """
    Serializer used for creating participants.
    - Accepts the new fields (phone, organization, position, country, event_type).
    - Generates and saves a QR image after participant instance is created.
    - Tries to send an email with the QR attached (best effort).
    """
    qr_base64 = serializers.SerializerMethodField(read_only=True)
    qr_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Participant
        fields = [
            'first_name', 'last_name', 'email',
            'phone', 'organization', 'position', 'country', 'event_type',
            'ticket_uuid', 'qr_base64', 'qr_url'
        ]
        read_only_fields = ['ticket_uuid', 'qr_base64', 'qr_url']

    def validate(self, attrs):
        # bloque la création si les inscriptions sont fermées
        try:
            setting = RegistrationSetting.get_solo()
            if not getattr(setting, "is_open", True):
                raise serializers.ValidationError(
                    "Registrations are currently closed.")
        except Exception:
            # Si le réglage n'existe pas ou erreur, on laisse passer (désirable lors de dev)
            pass
        
        # Vérifier l'unicité de l'email
        email = attrs.get('email')
        if email:
            # Si on est en mode update (instance existe), empêcher la modification de l'email
            if self.instance:
                if email != self.instance.email:
                    raise serializers.ValidationError({
                        'email': 'L\'email ne peut pas être modifié.'
                    })
            else:
                # En mode création, vérifier l'unicité
                existing_participant = Participant.objects.filter(email=email)
                if existing_participant.exists():
                    raise serializers.ValidationError({
                        'email': 'Un participant avec cet email existe déjà.'
                    })
        
        return attrs

    def create(self, validated_data):
        # Use a transaction so we don't leave a half-created participant if something se casse (optionnel)
        with transaction.atomic():
            participant = Participant.objects.create(**validated_data)

            # Construire le payload pour le QR — ici on encode le ticket_uuid (modifiable)
            qr_payload = f"ticket:{participant.ticket_uuid}"

            qr_bytes = None
            try:
                # Générer image QR (PIL.Image) puis bytes PNG
                qr_img = qrcode.make(qr_payload)
                buf = io.BytesIO()
                qr_img.save(buf, format='PNG')
                qr_bytes = buf.getvalue()
                buf.close()

                # Sauvegarder le fichier image dans le champ ImageField
                filename = f"{participant.ticket_uuid}.png"
                participant.qr_code.save(
                    filename, ContentFile(qr_bytes), save=False)
                participant.save()  # sauvegarde finale avec qr_code
            except Exception:
                # On continue même si génération du QR échoue
                # participant reste créé — qr_code restera null
                pass

        # Envoi d'email d'invitation avec template
        try:
            if participant.email:
                send_participant_invitation_email(participant, qr_bytes)
        except Exception:
            # fail_silently-like: on ignore l'erreur d'envoi
            pass

        return participant


class EventSettingsSerializer(serializers.ModelSerializer):
    """Serializer for EventSettings model."""
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EventSettings
        fields = ['event_name', 'event_description', 'venue', 'start_date', 'end_date', 'logo', 'logo_url', 'updated_at']
        read_only_fields = ['updated_at']
    
    def get_logo_url(self, obj):
        """Return the absolute URL for the logo image."""
        if obj.logo and hasattr(obj.logo, 'url'):
            from django.conf import settings
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            # Fallback to APP_DOMAIN setting
            return f"{settings.APP_DOMAIN}{obj.logo.url}"
        return None
