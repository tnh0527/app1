#!/usr/bin/env bash
# Render build script for Django backend
# This script runs during the build phase on Render

set -o errexit  # Exit on error

# Install Python dependencies
pip install -r requirements.txt

# Navigate to Django project directory
cd app1

# Run database migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

echo "Build completed successfully!"
