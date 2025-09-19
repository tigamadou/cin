from django.urls import path
from .views import ParticipantCreateAPIView, VerifyTicketAPIView


urlpatterns = [
    path('participants/', ParticipantCreateAPIView.as_view(),
         name='participants-create'),
    path('verify/', VerifyTicketAPIView.as_view(), name='verify-ticket'),
]
