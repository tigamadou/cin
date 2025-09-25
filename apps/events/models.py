# apps/events/models.py
from django.db import models
import uuid
from django.utils import timezone
import os


def upload_qr_path(instance, filename):
    """
    Génère le path où sera stockée l'image QR pour le participant.
    La migration importe directement cette fonction, donc elle doit exister.
    Exemple de path : qr_codes/<ticket_uuid>.png
    """
    try:
        # si ticket_uuid est un UUID, on le convertit en str
        uuid_str = str(instance.ticket_uuid)
    except Exception:
        # si ticket_uuid pas encore défini, générer un uuid temporaire
        uuid_str = str(uuid.uuid4())
    # conserver extension fournie (ou forcer .png)
    base, ext = os.path.splitext(filename)
    if not ext:
        ext = ".png"
    return os.path.join("qr_codes", f"{uuid_str}{ext}")


class Participant(models.Model):
    first_name = models.CharField("Prénoms", max_length=150)
    last_name = models.CharField("Nom", max_length=150, blank=True)
    email = models.EmailField("Email", unique=True)
    phone = models.CharField("Téléphone", max_length=30, blank=True)
    organization = models.CharField("Organisation", max_length=200, blank=True)
    position = models.CharField("Poste", max_length=150, blank=True)
    country = models.CharField("Pays", max_length=100, blank=True)
    event_type = models.CharField(
        "Type d'événement", max_length=100, blank=True)

    ticket_uuid = models.UUIDField(
        "Ticket UUID",
        default=uuid.uuid4,
        unique=True,
        editable=False
    )
    qr_code = models.ImageField(
        "QR Code",
        upload_to='qr_codes/',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField("Créé le", auto_now_add=True)

    # usage flag
    used = models.BooleanField("Utilisé", default=False)
    used_at = models.DateTimeField("Utilisé le", null=True, blank=True)

    class Meta:
        verbose_name = "Participant"
        verbose_name_plural = "Participants"
        ordering = ["-created_at"]

    def mark_used(self):
        """Idempotent: marque le ticket comme utilisé et enregistre la date."""
        if not self.used:
            self.used = True
            self.used_at = timezone.now()
            self.save(update_fields=['used', 'used_at'])

    def __str__(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return f"{full_name} <{self.email}>"


class RegistrationSetting(models.Model):
    """
    Small singleton model to store whether registration is open.
    We keep it simple: one row. Use get_solo() to access.
    """
    is_open = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Registrations {'open' if self.is_open else 'closed'}"

    @classmethod
    def get_solo(cls) -> "RegistrationSetting":
        obj, created = cls.objects.get_or_create(
            pk=1, defaults={'is_open': True})
        return obj
