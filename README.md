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
- Templates d'email HTML et texte pour invitations
- Endpoint de vérification d'UUID
- Dockerfile + docker-compose

## Variables d'environnement (voir `.env`)

- SECRET_KEY
- DEBUG (True/False)
- ALLOWED_HOSTS (ex: "localhost,127.0.0.1")
- EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS
- DEFAULT_FROM_EMAIL

### Configuration Email pour Mailhog (développement)
```env
# Mailhog SMTP settings
EMAIL_HOST=mailhog
EMAIL_PORT=1025
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=False
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=noreply@cin-event.com
```

### Configuration Email pour Production
```env
# Gmail SMTP example
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

## Installation rapide

### Option 1: Makefile (recommandé)
```bash
git clone <repository-url>
cd cin
make install
make superuser
```

### Option 2: Installation manuelle
1. Cloner le dépôt
2. `cp env.example .env` (éditer avec vos valeurs)
3. `docker compose up --build -d`
4. `docker compose exec web python manage.py migrate`
5. `docker compose exec web python manage.py createsuperuser`

## Déploiement en production

### Prérequis
- Docker et Docker Compose installés
- Caddy configuré pour le reverse proxy
- Domaine configuré

### Déploiement rapide
```bash
# 1. Cloner le dépôt
git clone <repository-url>
cd cin

# 2. Configurer l'environnement de production
cp env.prod.example .env.prod
# Éditer .env.prod avec vos valeurs de production

# 3. Déployer
make deploy
```

### Configuration Caddy
```caddy
yourdomain.com {
    reverse_proxy frontend:80
}

api.yourdomain.com {
    reverse_proxy web:8000
}
```

## Services disponibles

### Développement
- **Django**: http://localhost:8000
- **Frontend React**: http://localhost:5173 (Vite dev server)
- **Mailhog (emails)**: http://localhost:8025
- **PostgreSQL**: localhost:5432

### Production
- **Frontend**: http://localhost:3000 (Nginx + React build)
- **Backend API**: http://localhost:8000 (Gunicorn)
- **Redis**: localhost:6379

## Commandes utiles (Makefile)

### Installation et configuration
```bash
make install          # Installation complète
make setup            # Migrations + superuser
make superuser        # Créer un superutilisateur
```

### Développement
```bash
make dev              # Démarrer l'environnement de développement
make logs             # Voir les logs de tous les services
make logs-web         # Voir les logs du service web
make restart          # Redémarrer les services
make stop             # Arrêter les services
```

### Base de données
```bash
make migrate          # Exécuter les migrations
make shell            # Ouvrir un shell Django
make backup           # Sauvegarder la base de données
```

### Maintenance
```bash
make clean            # Nettoyer conteneurs et volumes
make test             # Exécuter les tests
make status           # Voir le statut des services
make help             # Afficher toutes les commandes
```

## Configuration Email

### 1. Créer le fichier .env
```bash
cp env.example .env
# Éditer .env avec vos valeurs
```

### 2. Configuration Mailhog (Développement)
Le système est configuré pour utiliser Mailhog par défaut :
- **SMTP Server**: mailhog:1025
- **Web UI**: http://localhost:8025
- **Aucune authentification** requise

### 3. Tester l'envoi d'emails
1. Créer un participant via l'interface
2. Vérifier l'email dans Mailhog : http://localhost:8025
3. L'email contient :
   - Template HTML professionnel
   - QR code en pièce jointe
   - Toutes les informations du participant

### 4. Configuration Production
Pour la production, remplacez les paramètres Mailhog par un vrai serveur SMTP :
- Gmail, Outlook, SendGrid, etc.
- Configurez les credentials appropriés
- Activez TLS/SSL selon le fournisseur

## Endpoints principaux

- POST `/api/participants/` : enregistrer un participant, renvoie `ticket_uuid` et `qr_base64` et `qr_url`.
- POST `/api/verify/` : corps JSON `{ "ticket_uuid": "..." }` renvoie `valid: true|false` et données du participant.
