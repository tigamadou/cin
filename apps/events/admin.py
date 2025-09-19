from django.contrib import admin
from .models import Participant


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):

    list_display = ('first_name', 'last_name', 'email',
                    'ticket_uuid', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'ticket_uuid')
