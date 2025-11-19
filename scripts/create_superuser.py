#!/usr/bin/env python
"""
Django management script to create a superuser non-interactively.
Usage: python create_superuser.py <username> <email> <password>
Or set environment variables: DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD
"""

import os
import sys

# Add the project root to Python path (where manage.py is located)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Change to project root directory
os.chdir(project_root)

import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_superuser(username=None, email=None, password=None):
    """Create a superuser non-interactively."""
    # Get from environment variables if not provided
    username = username or os.environ.get('DJANGO_SUPERUSER_USERNAME')
    email = email or os.environ.get('DJANGO_SUPERUSER_EMAIL')
    password = password or os.environ.get('DJANGO_SUPERUSER_PASSWORD')
    
    if not username:
        print("Error: Username is required")
        print("Usage: python create_superuser.py <username> <email> <password>")
        print("Or set environment variables: DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD")
        sys.exit(1)
    
    if not email:
        email = f"{username}@example.com"
        print(f"Warning: Email not provided, using default: {email}")
    
    if not password:
        print("Error: Password is required")
        sys.exit(1)
    
    # Check if user already exists
    if User.objects.filter(username=username).exists():
        print(f"User '{username}' already exists. Updating to superuser...")
        user = User.objects.get(username=username)
        user.is_superuser = True
        user.is_staff = True
        user.email = email
        user.set_password(password)
        user.save()
        print(f"✅ User '{username}' updated to superuser successfully!")
    else:
        # Create new superuser
        User.objects.create_superuser(username=username, email=email, password=password)
        print(f"✅ Superuser '{username}' created successfully!")
    
    return True

if __name__ == '__main__':
    if len(sys.argv) == 4:
        username, email, password = sys.argv[1], sys.argv[2], sys.argv[3]
        create_superuser(username, email, password)
    elif len(sys.argv) == 1:
        # Try to get from environment variables
        create_superuser()
    else:
        print("Usage: python create_superuser.py <username> <email> <password>")
        print("Or set environment variables: DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD")
        sys.exit(1)

