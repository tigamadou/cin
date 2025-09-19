from rest_framework import serializers
from .models import Participant
from .utils_qr import generate_qr_image_bytes, qr_bytes_to_base64
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ['id', 'first_name', 'last_name', 'email',
                  'ticket_uuid', 'qr_code', 'created_at']
        read_only_fields = ['ticket_uuid', 'qr_code', 'created_at']


class ParticipantCreateSerializer(serializers.ModelSerializer):
    qr_base64 = serializers.SerializerMethodField(read_only=True)
    qr_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Participant
        fields = ['first_name', 'last_name', 'email',
                  'ticket_uuid', 'qr_base64', 'qr_url']
        read_only_fields = ['ticket_uuid', 'qr_base64', 'qr_url']

    def create(self, validated_data):
        participant = Participant.objects.create(**validated_data)
        # Generate QR data: could be a direct UUID or a verification URL
        verification_url = f"{self.context.get('request').build_absolute_uri('/api/verify/')}"
        # or f"{verification_url}?ticket={participant.ticket_uuid}"
        qr_payload = f"ticket:{participant.ticket_uuid}"
        qr_bytes = generate_qr_image_bytes(qr_payload)
        # Save image to model
        participant.qr_code.save(
            f"{participant.ticket_uuid}.png", ContentFile(qr_bytes))
        participant.save()

        # Send email with QR attached (best-effort, silence exceptions)
        try:
            subject = 'Votre billet / QR code'
            body = f"Bonjour {participant.first_name},\n\nMerci pour votre inscription. Votre ticket: {participant.ticket_uuid}"
            email = EmailMessage(subject, body, to=[participant.email])
            email.attach(f"{participant.ticket_uuid}.png",
                         qr_bytes, 'image/png')
            email.send(fail_silently=True)
        except Exception:
            pass

        return participant

    def get_qr_base64(self, obj):
        if obj.qr_code:
            with obj.qr_code.open('rb') as f:
                return qr_bytes_to_base64(f.read())
        return None

    def get_qr_url(self, obj):
        request = self.context.get('request')
        if request and obj.qr_code:
            return request.build_absolute_uri(obj.qr_code.url)
        return None
