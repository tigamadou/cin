# apps/events/views.py
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny

from .serializers import ParticipantCreateSerializer, ParticipantSerializer
from .models import Participant, RegistrationSetting
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator


class ParticipantListCreateAPIView(generics.ListCreateAPIView):
    """
    GET  /api/participants/  -> liste des participants
    POST /api/participants/  -> créer un participant (génère QR + envoie mail)
    """
    queryset = Participant.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ParticipantCreateSerializer
        return ParticipantSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def create(self, request, *args, **kwargs):
        # Bloquer la création si les inscriptions sont fermées
        try:
            if not RegistrationSetting.get_solo().is_open:
                return Response({'detail': 'Registrations are closed.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            # en cas de problème d'accès au singleton, laisser passer (ou renvoyer une erreur si tu préfères)
            pass

        serializer = self.get_serializer(
            data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        participant = serializer.save()

        # Serializer de sortie (complet)
        out = ParticipantSerializer(
            participant, context={'request': request}).data

        # Ajouter qr_base64 et qr_url via les helpers du serializer de création
        try:
            out['qr_base64'] = serializer.get_qr_base64(participant)
        except Exception:
            out['qr_base64'] = None
        try:
            out['qr_url'] = serializer.get_qr_url(participant)
        except Exception:
            out['qr_url'] = request.build_absolute_uri(
                participant.qr_code.url) if participant.qr_code else None

        headers = self.get_success_headers(serializer.data)
        return Response(out, status=status.HTTP_201_CREATED, headers=headers)


class ParticipantRetrieveAPIView(generics.RetrieveAPIView):
    """
    GET /api/participants/<pk>/ -> détail d'un participant
    Fournit aussi qr_base64 et qr_url.
    """
    queryset = Participant.objects.all()
    serializer_class = ParticipantSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        data = self.get_serializer(instance, context={'request': request}).data

        # Tentative d'ajout des infos QR via le serializer de création (helpers)
        try:
            create_ser = ParticipantCreateSerializer(
                instance, context={'request': request})
            data['qr_base64'] = create_ser.get_qr_base64(instance)
            data['qr_url'] = create_ser.get_qr_url(instance)
        except Exception:
            # Fallback : lire le fichier si présent
            try:
                if instance.qr_code:
                    with instance.qr_code.open('rb') as f:
                        import base64
                        data['qr_base64'] = base64.b64encode(
                            f.read()).decode('utf-8')
                        data['qr_url'] = request.build_absolute_uri(
                            instance.qr_code.url)
                else:
                    data['qr_base64'] = None
                    data['qr_url'] = None
            except Exception:
                data['qr_base64'] = None
                data['qr_url'] = None

        return Response(data)


class VerifyTicketAPIView(APIView):
    """
    POST /api/verify/
    Body: { "ticket_uuid": "...", "mark_used": true|false (optional) }

    Réponses :
      - 200 { valid: true, participant: {...} } si trouvé (et non déjà utilisé),
      - 200 { valid: false, already_used: true, participant: {...} } si déjà utilisé,
      - 404 { valid: false } si non trouvé.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        ticket_uuid = request.data.get(
            'ticket_uuid') or request.data.get('ticket')
        if not ticket_uuid:
            return Response({'detail': 'ticket_uuid required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            participant = Participant.objects.get(ticket_uuid=ticket_uuid)
        except Participant.DoesNotExist:
            return Response({'valid': False}, status=status.HTTP_404_NOT_FOUND)

        # Si déjà utilisé
        if getattr(participant, 'used', False):
            data = ParticipantSerializer(
                participant, context={'request': request}).data
            return Response({'valid': False, 'already_used': True, 'participant': data}, status=status.HTTP_200_OK)

        # Si on demande de marquer comme utilisé
        mark_used = request.data.get('mark_used', False)
        if mark_used and hasattr(participant, 'used'):
            try:
                participant.mark_used()
            except Exception:
                # ne doit pas empêcher la réponse
                pass

        # Construire la réponse avec info QR
        data = ParticipantSerializer(
            participant, context={'request': request}).data
        try:
            create_ser = ParticipantCreateSerializer(
                participant, context={'request': request})
            data['qr_base64'] = create_ser.get_qr_base64(participant)
            data['qr_url'] = create_ser.get_qr_url(participant)
        except Exception:
            data['qr_base64'] = None
            data['qr_url'] = request.build_absolute_uri(
                participant.qr_code.url) if participant.qr_code else None

        return Response({'valid': True, 'participant': data}, status=status.HTTP_200_OK)


class ToggleRegistrationAPIView(APIView):
    """
    GET  /api/toggle-registration/  -> retourne l'état (is_open, updated_at)
    POST /api/toggle-registration/ -> toggle ou set { "is_open": true|false }
    Protégé aux administrateurs.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        rs = RegistrationSetting.get_solo()
        return Response({'is_open': rs.is_open, 'updated_at': rs.updated_at})

    def post(self, request):
        rs = RegistrationSetting.get_solo()
        if 'is_open' in request.data:
            rs.is_open = bool(request.data.get('is_open'))
        else:
            rs.is_open = not rs.is_open
        rs.save()
        return Response({'is_open': rs.is_open, 'updated_at': rs.updated_at})


class CurrentUserAPIView(APIView):
    """
    GET /api/current_user/ -> infos simples sur l'utilisateur pour le frontend.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        return Response({
            'is_authenticated': bool(user and user.is_authenticated),
            'is_staff': bool(user and user.is_staff),
            'username': user.username if (user and user.is_authenticated) else None,
        })


class CsrfTokenView(APIView):
    """
    GET /api/csrf/  -> renvoie un CSRF cookie (via ensure_csrf_cookie)
    Utilise côté frontend pour obtenir le cookie csrftoken avant POST login.
    """
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        # get_token garantit qu'un cookie 'csrftoken' est mis (par middleware)
        token = get_token(request)
        return Response({"detail": "CSRF cookie set", "csrfToken": token})


class LoginAPIView(APIView):
    """
    POST /api/login/  - { username, password }
    - authenticate + login (session)
    - retourne 200 + { is_authenticated, is_staff, username } si ok
    - retourne 400/403 si échec
    IMPORTANT: le frontend doit inclure le cookie CSRF (fetch credentials: 'include')
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({"detail": "username & password required"}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"detail": "User disabled"}, status=status.HTTP_403_FORBIDDEN)

        # For your app: restrict that only staff can login to frontend
        if not user.is_staff:
            return Response({"detail": "Admin access only"}, status=status.HTTP_403_FORBIDDEN)

        login(request, user)
        return Response({
            "is_authenticated": True,
            "is_staff": user.is_staff,
            "username": user.username,
        })


class LogoutAPIView(APIView):
    """
    POST /api/logout/  -> logout (session)
    """

    def post(self, request):
        logout(request)
        return Response({"detail": "logged out"})
