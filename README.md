# Appli Django — Scan / génération QR pour event

Ce dépôt contient une application Django minimale qui :

- Reçoit via une API un formulaire d'inscription d'un participant.
- Sauvegarde le participant (UUID de ticket unique).
- Génère un QR code (image PNG) contenant l'UUID (ou une URL de vérification).
- Retourne au frontend l'URL/base64 du QR code et envoie le QR par e-mail.
- Fournit un panneau admin Django pour visualiser les participants.
- Fournit une route API pour vérifier la validité d'un QR (scan côté point de contrôle).

## Fonctionnalités incluses

- Django + Django REST Framework
- Génération de QR via `qrcode` et `Pillow` (PIL)
- Sauvegarde du QR en `MEDIA_ROOT`
- Envoi d'e-mail avec pièce jointe (config via variables d'environnement)
- Endpoint de vérification d'UUID
- Dockerfile + docker-compose

## Variables d'environnement (voir `.env`)

- SECRET_KEY
- DEBUG (True/False)
- ALLOWED_HOSTS (ex: "localhost,127.0.0.1")
- EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS
- DEFAULT_FROM_EMAIL

## Installer et lancer en local

1. Cloner le dépôt
2. `docker compose up --build -d`
3. `python manage.py migrate`
4. `python manage.py createsuperuser`
5. `python manage.py runserver`

## Endpoints principaux

- POST `/api/participants/` : enregistrer un participant, renvoie `ticket_uuid` et `qr_base64` et `qr_url`.
- POST `/api/verify/` : corps JSON `{ "ticket_uuid": "..." }` renvoie `valid: true|false` et données du participant.
