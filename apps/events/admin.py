# apps/events/admin.py
from django.contrib import admin
from .models import Participant, RegistrationSetting


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email',
                    'ticket_uuid', 'used', 'used_at', 'created_at')
    list_filter = ('used', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'ticket_uuid')


@admin.register(RegistrationSetting)
class RegistrationSettingAdmin(admin.ModelAdmin):
    list_display = ('is_open', 'updated_at')
