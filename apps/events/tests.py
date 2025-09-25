# apps/events/tests/test_api.py
from django.urls import reverse, NoReverseMatch
from rest_framework.test import APIClient
from django.test import TestCase

from .models import Participant


class ParticipantAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_participant_and_basic_verify(self):
        """
        1) Crée un participant via l'API (POST)
        2) Vérifie que la réponse est 201 et contient ticket_uuid
        3) Vérifie en base que le participant existe et que used est False
        4) (Optionnel) Essayez d'appeler un endpoint 'verify-ticket' si il existe,
           sinon on skip cette étape proprement.
        """
        data = {
            'first_name': 'Alice',
            'last_name': 'Dupont',
            'email': 'alice@example.com'
        }

        # Résolution de l'URL : on essaie reverse('participants-create'), sinon fallback.
        try:
            create_url = reverse('participants-create')
        except NoReverseMatch:
            # Fallback vers l'URL que ton API expose généralement.
            create_url = '/api/participants/'

        resp = self.client.post(create_url, data, format='json')
        self.assertEqual(resp.status_code, 201,
                         msg=f"expected 201, got {resp.status_code} - {resp.data}")

        # Doit contenir ticket_uuid dans la réponse
        self.assertIn('ticket_uuid', resp.data)
        ticket = resp.data['ticket_uuid']

        # Vérifier en base que le participant est créé et non utilisé
        try:
            participant = Participant.objects.get(ticket_uuid=ticket)
        except Participant.DoesNotExist:
            self.fail(
                f"Participant with ticket_uuid {ticket} was not found in DB.")

        self.assertFalse(participant.used,
                         msg="New participant should not be marked as used.")

        # Si tu as un endpoint 'verify-ticket', on l'appelle; sinon on skip proprement
        try:
            verify_url = reverse('verify-ticket')
        except NoReverseMatch:
            verify_url = None

        if verify_url:
            resp2 = self.client.post(
                verify_url, {'ticket_uuid': ticket}, format='json')
            # On accepte 200 (valid) ou 202/204 suivant l'implémentation; on vérifie la payload si présente
            self.assertIn(resp2.status_code, (200, 202, 204))
            if resp2.status_code == 200:
                # Attente d'une clé 'valid' dans la réponse si l'endpoint est de type validation
                self.assertIn('valid', resp2.data)
        else:
            # Pas d'endpoint verify-ticket : on considère que la vérification sera faite via une autre route / UI
            self.skipTest(
                "No 'verify-ticket' URL configured; basic DB assertions performed instead.")
