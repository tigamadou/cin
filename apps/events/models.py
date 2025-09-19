import uuid
from django.db import models


def upload_qr_path(instance, filename):
    return f'qr_codes/{instance.ticket_uuid}.png'


class Participant(models.Model):
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField()
    ticket_uuid = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False)
    qr_code = models.ImageField(
        upload_to=upload_qr_path, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


def __str__(self):
    return f"{self.first_name} {self.last_name} <{self.email}> - {self.ticket_uuid}"
