from django.urls import reverse
from rest_framework.test import APIClient
from django.test import TestCase
from .models import Participant


class ParticipantAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_participant_and_verify(self):
        data = {'first_name': 'Alice', 'last_name': 'Dupont',
                'email': 'alice@example.com'}
        resp = self.client.post(
            reverse('participants-create'), data, format='json')
        self.assertEqual(resp.status_code, 201)
        ticket = resp.data['ticket_uuid']
        # verify
        resp2 = self.client.post(
            reverse('verify-ticket'), {'ticket_uuid': ticket}, format='json')
        self.assertEqual(resp2.status_code, 200)
        self.assertTrue(resp2.data['valid'])
