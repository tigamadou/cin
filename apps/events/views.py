# apps/events/views.py
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny

from .serializers import ParticipantCreateSerializer, ParticipantSerializer
from .models import Participant, RegistrationSetting
from django.db import transaction
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError


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
        # met le request dans le contexte pour construire des URLs absolues
        return {'request': self.request}

    def create(self, request, *args, **kwargs):
        # Bloquer la création si les inscriptions sont fermées
        try:
            setting = RegistrationSetting.get_solo()
            if not getattr(setting, "is_open", True):
                return Response(
                    {'detail': 'Registrations are closed.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Exception:
            # en cas de problème d'accès au singleton, on laisse passer (option de dev)
            pass

        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)

        # Créer l'objet dans une transaction (consistance si on veut étendre)
        with transaction.atomic():
            participant = serializer.save()
            
            # Créer un utilisateur si l'email n'est pas déjà utilisé
            try:
                User = get_user_model()
                email = participant.email
                
                # Vérifier si un utilisateur avec cet email existe déjà
                if not User.objects.filter(email=email).exists():
                    # Générer un nom d'utilisateur basé sur l'email
                    username = email.split('@')[0]
                    # S'assurer que le nom d'utilisateur est unique
                    original_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{original_username}_{counter}"
                        counter += 1
                    
                    # Créer l'utilisateur
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        first_name=participant.first_name,
                        last_name=participant.last_name,
                        password=None  # Pas de mot de passe par défaut
                    )
                    # Marquer l'utilisateur comme inactif par défaut (sécurité)
                    user.is_active = False
                    user.save()
                    
            except Exception as e:
                # En cas d'erreur lors de la création de l'utilisateur,
                # on continue sans échouer la création du participant
                pass

        # Sérialiser la sortie complète (avec helpers QR)
        out = ParticipantSerializer(
            participant, context=self.get_serializer_context()).data

        # Essayer d'ajouter qr_base64 et qr_url via le serializer de création (celui qui contient les helpers)
        try:
            # serializer est la classe de création utilisée ci-dessus
            out['qr_base64'] = serializer.get_qr_base64(participant)
        except Exception:
            out['qr_base64'] = None

        try:
            out['qr_url'] = serializer.get_qr_url(participant)
        except Exception:
            # fallback sûr : ne pas accéder à .url si qr_code est None
            try:
                if getattr(participant, "qr_code", None) and getattr(participant.qr_code, "url", None):
                    out['qr_url'] = request.build_absolute_uri(
                        participant.qr_code.url)
                else:
                    out['qr_url'] = None
            except Exception:
                out['qr_url'] = None

        headers = self.get_success_headers(serializer.data)
        return Response(out, status=status.HTTP_201_CREATED, headers=headers)


class ParticipantRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/participants/<pk>/ -> détail d'un participant
    PUT/PATCH /api/participants/<pk>/ -> modifier un participant
    DELETE /api/participants/<pk>/ -> supprimer un participant
    Fournit aussi qr_base64 et qr_url.
    """
    queryset = Participant.objects.all()
    permission_classes = [IsAdminUser]  # Seuls les admins peuvent modifier/supprimer

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ParticipantCreateSerializer
        return ParticipantSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, context=self.get_serializer_context())
        data = serializer.data

        # Les helpers sont disponibles sur le serializer (QRMixin) — on préfère les utiliser
        try:
            data['qr_base64'] = serializer.get_qr_base64(instance)
        except Exception:
            data['qr_base64'] = None

        try:
            data['qr_url'] = serializer.get_qr_url(instance)
        except Exception:
            try:
                if getattr(instance, "qr_code", None) and getattr(instance.qr_code, "url", None):
                    data['qr_url'] = request.build_absolute_uri(
                        instance.qr_code.url)
                else:
                    data['qr_url'] = None
            except Exception:
                data['qr_url'] = None

        return Response(data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Utiliser le serializer de création pour les mises à jour
        serializer = ParticipantCreateSerializer(
            instance, data=request.data, partial=partial, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            participant = serializer.save()
            
            # Mettre à jour l'utilisateur associé si l'email a changé
            try:
                User = get_user_model()
                old_email = instance.email
                new_email = participant.email
                
                if old_email != new_email:
                    # Mettre à jour l'email de l'utilisateur existant
                    try:
                        user = User.objects.get(email=old_email)
                        user.email = new_email
                        user.first_name = participant.first_name
                        user.last_name = participant.last_name
                        user.save()
                    except User.DoesNotExist:
                        # Si pas d'utilisateur avec l'ancien email, créer un nouveau
                        if not User.objects.filter(email=new_email).exists():
                            username = new_email.split('@')[0]
                            original_username = username
                            counter = 1
                            while User.objects.filter(username=username).exists():
                                username = f"{original_username}_{counter}"
                                counter += 1
                            
                            user = User.objects.create_user(
                                username=username,
                                email=new_email,
                                first_name=participant.first_name,
                                last_name=participant.last_name,
                                password=None,
                                is_active=False
                            )
            except Exception:
                # En cas d'erreur, on continue sans échouer la mise à jour du participant
                pass

        # Retourner les données mises à jour avec QR
        out = ParticipantSerializer(
            participant, context=self.get_serializer_context()).data
        
        try:
            out['qr_base64'] = serializer.get_qr_base64(participant)
        except Exception:
            out['qr_base64'] = None

        try:
            out['qr_url'] = serializer.get_qr_url(participant)
        except Exception:
            try:
                if getattr(participant, "qr_code", None) and getattr(participant.qr_code, "url", None):
                    out['qr_url'] = request.build_absolute_uri(participant.qr_code.url)
                else:
                    out['qr_url'] = None
            except Exception:
                out['qr_url'] = None

        return Response(out)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Supprimer l'utilisateur associé si il existe
        try:
            User = get_user_model()
            user = User.objects.get(email=instance.email)
            user.delete()
        except User.DoesNotExist:
            # Pas d'utilisateur associé, on continue
            pass
        except Exception:
            # En cas d'erreur, on continue sans échouer la suppression du participant
            pass
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class ActivateUserAPIView(APIView):
    """
    POST /api/activate-user/  -> { email, password }
    Active un utilisateur créé automatiquement lors de l'inscription d'un participant.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {"detail": "email and password required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            User = get_user_model()
            user = User.objects.get(email=email, is_active=False)
            
            # Définir le mot de passe et activer l'utilisateur
            user.set_password(password)
            user.is_active = True
            user.save()
            
            return Response({
                "detail": "User activated successfully",
                "username": user.username
            })
            
        except User.DoesNotExist:
            return Response(
                {"detail": "No inactive user found with this email"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": "Error activating user"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
