# CIN Event Management System - Makefile
# =====================================

.PHONY: help install dev prod setup setup-data-dirs migrate shell superuser superuser-noninteractive logs clean restart test deploy deploy-full deploy-caddy

# Couleurs pour les messages
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Configuration par défaut
ENV_FILE = .env
DOCKER_COMPOSE = docker compose

help: ## Afficher l'aide
	@echo "$(GREEN)CIN Event Management System$(NC)"
	@echo "================================"
	@echo ""
	@echo "$(YELLOW)Commandes disponibles:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Installation complète (développement)
	@echo "$(GREEN)🚀 Installation de CIN Event Management System...$(NC)"
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)📝 Création du fichier .env...$(NC)"; \
		cp env.example $(ENV_FILE); \
		echo "$(GREEN)✅ Fichier .env créé! Veuillez l'éditer avec vos valeurs.$(NC)"; \
	else \
		echo "$(GREEN)✅ Fichier .env existe déjà.$(NC)"; \
	fi
	@echo "$(YELLOW)🔧 Rendre les scripts de déploiement exécutables...$(NC)"
	@chmod +x deploy.sh deploy-full.sh deploy-caddy.sh setup-data-dirs.sh 2>/dev/null || true
	@echo "$(GREEN)✅ Scripts de déploiement configurés!$(NC)"
	@echo "$(YELLOW)🐳 Démarrage des services Docker...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(YELLOW)⏳ Attente que les services soient prêts...$(NC)"
	@sleep 10
	@echo "$(YELLOW)🗄️ Exécution des migrations de base de données...$(NC)"
	$(DOCKER_COMPOSE) exec web python manage.py migrate
	@echo "$(GREEN)🎉 Installation terminée!$(NC)"
	@echo ""
	@echo "$(YELLOW)🌐 Accédez à votre application:$(NC)"
	@echo "   - Django Admin: http://localhost:8000/admin"
	@echo "   - Frontend: http://localhost:5173"
	@echo "   - Mailhog: http://localhost:8025"
	@echo ""
	@echo "$(YELLOW)📝 Prochaines étapes:$(NC)"
	@echo "   1. Éditez le fichier .env avec votre configuration"
	@echo "   2. Créez un superutilisateur: make superuser"
	@echo "   3. Créez des participants via le frontend"
	@echo "   4. Vérifiez les emails dans Mailhog"

dev: ## Démarrer l'environnement de développement
	@echo "$(GREEN)🚀 Démarrage de l'environnement de développement...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✅ Services démarrés!$(NC)"
	@echo "$(YELLOW)🌐 Accédez à:$(NC)"
	@echo "   - Frontend: http://localhost:5173"
	@echo "   - Django: http://localhost:8000"
	@echo "   - Mailhog: http://localhost:8025"

prod: ## Démarrer l'environnement de production
	@echo "$(GREEN)🚀 Démarrage de l'environnement de production...$(NC)"
	@if [ ! -f .env.prod ]; then \
		echo "$(YELLOW)📝 Création du fichier .env.prod...$(NC)"; \
		cp env.prod.example .env.prod; \
		echo "$(YELLOW)⚠️  Veuillez éditer .env.prod avec vos valeurs de production.$(NC)"; \
		exit 1; \
	fi
	@if [ ! -f docker-compose.yml ] && [ -f docker-compose.prod.yml ]; then \
		echo "$(YELLOW)📝 Copie de docker-compose.prod.yml vers docker-compose.yml...$(NC)"; \
		cp docker-compose.prod.yml docker-compose.yml; \
	fi
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✅ Services de production démarrés!$(NC)"

deploy: ## Déployer en production (script complet)
	@echo "$(GREEN)🚀 Déploiement complet en production...$(NC)"
	@chmod +x deploy.sh 2>/dev/null || true
	./deploy.sh

deploy-full: ## Déployer en production (script complet avec migrations)
	@echo "$(GREEN)🚀 Déploiement complet en production avec migrations...$(NC)"
	@chmod +x deploy-full.sh 2>/dev/null || true
	./deploy-full.sh

deploy-caddy: ## Déployer le Caddyfile en production
	@echo "$(GREEN)🚀 Déploiement du Caddyfile en production...$(NC)"
	@chmod +x deploy-caddy.sh 2>/dev/null || true
	./deploy-caddy.sh

setup-data-dirs: ## Créer les dossiers de données externes pour la production
	@echo "$(GREEN)📁 Configuration des dossiers de données externes...$(NC)"
	@./setup-data-dirs.sh

setup: ## Configuration initiale (migrations + superuser)
	@echo "$(YELLOW)🗄️ Exécution des migrations...$(NC)"
	$(DOCKER_COMPOSE) exec web python manage.py migrate
	@echo "$(YELLOW)👤 Création d'un superutilisateur...$(NC)"
	@echo "$(YELLOW)💡 Utilisez 'make superuser' pour créer un superutilisateur interactivement$(NC)"

migrate: ## Exécuter les migrations
	@echo "$(YELLOW)🗄️ Exécution des migrations...$(NC)"
	$(DOCKER_COMPOSE) exec web python manage.py migrate
	@echo "$(GREEN)✅ Migrations terminées!$(NC)"

shell: ## Ouvrir un shell Django
	@echo "$(GREEN)🐍 Ouverture du shell Django...$(NC)"
	$(DOCKER_COMPOSE) exec web python manage.py shell

superuser: ## Créer un superutilisateur (interactif)
	@echo "$(YELLOW)👤 Création d'un superutilisateur (mode interactif)...$(NC)"
	@echo "$(YELLOW)💡 Pour un mode non-interactif, utilisez: make superuser-noninteractive$(NC)"
	$(DOCKER_COMPOSE) exec -it web python manage.py createsuperuser

superuser-noninteractive: ## Créer un superutilisateur (non-interactif avec variables d'environnement)
	@echo "$(YELLOW)👤 Création d'un superutilisateur (mode non-interactif)...$(NC)"
	@if [ -f $(ENV_FILE) ]; then \
		set -a; \
		source $(ENV_FILE); \
		set +a; \
	fi
	@if [ -z "$$DJANGO_SUPERUSER_USERNAME" ] || [ -z "$$DJANGO_SUPERUSER_PASSWORD" ]; then \
		echo "$(RED)❌ Erreur: DJANGO_SUPERUSER_USERNAME et DJANGO_SUPERUSER_PASSWORD sont requis$(NC)"; \
		echo "$(YELLOW)💡 Définissez-les dans votre fichier .env ou passez-les en ligne de commande:$(NC)"; \
		echo "$(YELLOW)   DJANGO_SUPERUSER_USERNAME=admin DJANGO_SUPERUSER_EMAIL=admin@example.com DJANGO_SUPERUSER_PASSWORD=password make superuser-noninteractive$(NC)"; \
		exit 1; \
	fi
	@DJANGO_SUPERUSER_USERNAME="$$DJANGO_SUPERUSER_USERNAME" \
	 DJANGO_SUPERUSER_EMAIL="$$DJANGO_SUPERUSER_EMAIL" \
	 DJANGO_SUPERUSER_PASSWORD="$$DJANGO_SUPERUSER_PASSWORD" \
	 $(DOCKER_COMPOSE) exec -T web python scripts/create_superuser.py

logs: ## Afficher les logs des services
	@echo "$(GREEN)📋 Affichage des logs...$(NC)"
	$(DOCKER_COMPOSE) logs -f

logs-web: ## Afficher les logs du service web
	@echo "$(GREEN)📋 Logs du service web...$(NC)"
	$(DOCKER_COMPOSE) logs -f web

logs-db: ## Afficher les logs de la base de données
	@echo "$(GREEN)📋 Logs de la base de données...$(NC)"
	$(DOCKER_COMPOSE) logs -f postgres

clean: ## Nettoyer les conteneurs et volumes
	@echo "$(RED)🧹 Nettoyage des conteneurs et volumes...$(NC)"
	$(DOCKER_COMPOSE) down -v
	@echo "$(GREEN)✅ Nettoyage terminé!$(NC)"

restart: ## Redémarrer les services
	@echo "$(YELLOW)🔄 Redémarrage des services...$(NC)"
	$(DOCKER_COMPOSE) restart
	@echo "$(GREEN)✅ Services redémarrés!$(NC)"

stop: ## Arrêter les services
	@echo "$(YELLOW)⏹️ Arrêt des services...$(NC)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✅ Services arrêtés!$(NC)"

test: ## Exécuter les tests
	@echo "$(GREEN)🧪 Exécution des tests...$(NC)"
	$(DOCKER_COMPOSE) exec web python manage.py test
	@echo "$(GREEN)✅ Tests terminés!$(NC)"

status: ## Afficher le statut des services
	@echo "$(GREEN)📊 Statut des services:$(NC)"
	$(DOCKER_COMPOSE) ps

build: ## Construire les images Docker
	@echo "$(GREEN)🔨 Construction des images Docker...$(NC)"
	$(DOCKER_COMPOSE) build
	@echo "$(GREEN)✅ Images construites!$(NC)"

update: ## Mettre à jour les dépendances
	@echo "$(GREEN)📦 Mise à jour des dépendances...$(NC)"
	$(DOCKER_COMPOSE) exec web pip install -r requirements.txt
	$(DOCKER_COMPOSE) exec frontend npm install
	@echo "$(GREEN)✅ Dépendances mises à jour!$(NC)"

backup: ## Sauvegarder la base de données
	@echo "$(GREEN)💾 Sauvegarde de la base de données...$(NC)"
	$(DOCKER_COMPOSE) exec postgres pg_dump -U postgres postgres > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Sauvegarde terminée!$(NC)"

# Commandes de développement rapide
dev-logs: logs-web ## Alias pour logs-web
dev-restart: restart ## Alias pour restart
dev-stop: stop ## Alias pour stop

# Commandes de production
# Note: Ces commandes utilisent docker-compose.yml (renommé depuis docker-compose.prod.yml sur le serveur)
prod-logs: ## Logs en mode production
	$(DOCKER_COMPOSE) logs -f

prod-restart: ## Redémarrage en mode production
	$(DOCKER_COMPOSE) restart

prod-stop: ## Arrêt en mode production
	$(DOCKER_COMPOSE) down

prod-migrate: ## Exécuter les migrations en production
	$(DOCKER_COMPOSE) exec cin-api python manage.py migrate

prod-collectstatic: ## Collecter les fichiers statiques en production
	$(DOCKER_COMPOSE) exec cin-api python manage.py collectstatic --noinput

prod-shell: ## Ouvrir un shell Django en production
	$(DOCKER_COMPOSE) exec cin-api python manage.py shell

prod-status: ## Vérifier le statut des services de production
	$(DOCKER_COMPOSE) ps

prod-superuser: ## Créer un superutilisateur en production (interactif)
	@echo "$(YELLOW)👤 Création d'un superutilisateur en production (mode interactif)...$(NC)"
	$(DOCKER_COMPOSE) exec -it cin-api python manage.py createsuperuser

prod-superuser-noninteractive: ## Créer un superutilisateur en production (non-interactif)
	@echo "$(YELLOW)👤 Création d'un superutilisateur en production (mode non-interactif)...$(NC)"
	@if [ -f .env.prod ]; then \
		set -a; \
		source .env.prod; \
		set +a; \
	fi
	@if [ -z "$$DJANGO_SUPERUSER_USERNAME" ] || [ -z "$$DJANGO_SUPERUSER_PASSWORD" ]; then \
		echo "$(RED)❌ Erreur: DJANGO_SUPERUSER_USERNAME et DJANGO_SUPERUSER_PASSWORD sont requis$(NC)"; \
		echo "$(YELLOW)💡 Définissez-les dans votre fichier .env.prod ou passez-les en ligne de commande$(NC)"; \
		exit 1; \
	fi
	@DJANGO_SUPERUSER_USERNAME="$$DJANGO_SUPERUSER_USERNAME" \
	 DJANGO_SUPERUSER_EMAIL="$$DJANGO_SUPERUSER_EMAIL" \
	 DJANGO_SUPERUSER_PASSWORD="$$DJANGO_SUPERUSER_PASSWORD" \
	 $(DOCKER_COMPOSE) exec -T cin-api python scripts/create_superuser.py
