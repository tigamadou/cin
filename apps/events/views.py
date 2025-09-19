from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import ParticipantCreateSerializer, ParticipantSerializer
from .models import Participant


class ParticipantCreateAPIView(APIView):
    def post(self, request):
        serializer = ParticipantCreateSerializer(
            data=request.data, context={'request': request})
        if serializer.is_valid():
            participant = serializer.save()
            out = ParticipantSerializer(
                participant, context={'request': request}).data
            # ajouter qr_base64 et qr_url à la réponse
            out['qr_base64'] = serializer.get_qr_base64(participant)
            out['qr_url'] = serializer.get_qr_url(participant)
            return Response(out, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyTicketAPIView(APIView):
    def post(self, request):

        ticket_uuid = request.data.get(
            'ticket_uuid') or request.data.get('ticket')
        if not ticket_uuid:
            return Response({'detail': 'ticket_uuid required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            participant = Participant.objects.get(ticket_uuid=ticket_uuid)
            data = ParticipantSerializer(participant).data
            return Response({'valid': True, 'participant': data})
        except Participant.DoesNotExist:
            return Response({'valid': False}, status=status.HTTP_404_NOT_FOUND)
