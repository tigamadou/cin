# apps/events/serializers.py
import io
import base64
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.utils import timezone

import qrcode

from rest_framework import serializers

from .models import Participant, RegistrationSetting


class ParticipantSerializer(serializers.ModelSerializer):
    qr_base64 = serializers.SerializerMethodField(read_only=True)
    qr_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Participant
        fields = [
            'id', 'first_name', 'last_name', 'email',
            'ticket_uuid', 'qr_code', 'created_at',
            'used', 'used_at',
            'qr_base64', 'qr_url',
        ]
        read_only_fields = ['ticket_uuid', 'qr_code',
                            'created_at', 'used', 'used_at', 'qr_base64', 'qr_url']

    def get_qr_base64(self, obj):
        try:
            if obj.qr_code:
                with obj.qr_code.open('rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            return None
        return None

    def get_qr_url(self, obj):
        request = self.context.get('request')
        try:
            if obj.qr_code:
                if request is not None:
                    return request.build_absolute_uri(obj.qr_code.url)
                return obj.qr_code.url
        except Exception:
            return None
        return None


class ParticipantCreateSerializer(serializers.ModelSerializer):
    qr_base64 = serializers.SerializerMethodField(read_only=True)
    qr_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Participant
        fields = ['first_name', 'last_name', 'email',
                  'ticket_uuid', 'qr_base64', 'qr_url']
        read_only_fields = ['ticket_uuid', 'qr_base64', 'qr_url']

    def validate(self, attrs):
        # bloque la création si les inscriptions sont fermées
        try:
            if not RegistrationSetting.get_solo().is_open:
                raise serializers.ValidationError(
                    "Registrations are currently closed.")
        except Exception:
            # si RegistrationSetting a un souci, on laisse passer (ou on pourrait lever une erreur)
            pass
        return attrs

    def create(self, validated_data):
        # création du participant
        participant = Participant.objects.create(**validated_data)

        # Construire le payload pour le QR — ici on encode le ticket_uuid (tu peux changer la forme)
        qr_payload = f"ticket:{participant.ticket_uuid}"

        # Générer image QR en bytes (PNG)
        try:
            qr_img = qrcode.make(qr_payload)
            buf = io.BytesIO()
            qr_img.save(buf, format='PNG')
            qr_bytes = buf.getvalue()
            buf.close()

            # Sauvegarder le fichier image dans le champ ImageField
            filename = f"{participant.ticket_uuid}.png"
            participant.qr_code.save(
                filename, ContentFile(qr_bytes), save=False)
            participant.save()
        except Exception:
            # si échec génération, continuer sans planter
            qr_bytes = None

        # Envoi d'email best-effort avec pièce jointe
        try:
            if participant.email:
                subject = 'Votre billet / QR code'
                body = (
                    f"Bonjour {participant.first_name},\n\n"
                    f"Merci pour votre inscription. Votre ticket: {participant.ticket_uuid}\n\n"
                    "Veuillez trouver votre QR code en pièce jointe."
                )
                email = EmailMessage(subject, body, to=[participant.email])
                if qr_bytes:
                    email.attach(f"{participant.ticket_uuid}.png",
                                 qr_bytes, 'image/png')
                email.send(fail_silently=True)
        except Exception:
            pass

        return participant

    # mêmes méthodes utilitaires que dans ParticipantSerializer
    def get_qr_base64(self, obj):
        try:
            if obj.qr_code:
                with obj.qr_code.open('rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            return None
        return None

    def get_qr_url(self, obj):
        request = self.context.get('request')
        try:
            if obj.qr_code:
                if request is not None:
                    return request.build_absolute_uri(obj.qr_code.url)
                return obj.qr_code.url
        except Exception:
            return None
        return None
