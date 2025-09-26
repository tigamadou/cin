# apps/events/urls.py
from django.urls import path
from .views import (
    ParticipantListCreateAPIView,
    ParticipantRetrieveUpdateDestroyAPIView,
    VerifyTicketAPIView,
    ToggleRegistrationAPIView,
    CurrentUserAPIView,
    CsrfTokenView, LoginAPIView, LogoutAPIView,
    ActivateUserAPIView,
    EventSettingsAPIView
)

urlpatterns = [
    # participants
    path('participants/', ParticipantListCreateAPIView.as_view(),
         name='participants-list-create'),
    path('participants/<int:pk>/', ParticipantRetrieveUpdateDestroyAPIView.as_view(),
         name='participant-detail'),

    # verification
    path('verify/', VerifyTicketAPIView.as_view(), name='verify-ticket'),

    # toggle registration (admin only)
    path('toggle-registration/', ToggleRegistrationAPIView.as_view(),
         name='toggle-registration'),

    # info utilisateur courant pour le frontend
    path('current_user/', CurrentUserAPIView.as_view(), name='current-user'),
    path('csrf/', CsrfTokenView.as_view(), name='csrf'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('activate-user/', ActivateUserAPIView.as_view(), name='activate-user'),
    
    # event settings
    path('event-settings/', EventSettingsAPIView.as_view(), name='event-settings'),
]
