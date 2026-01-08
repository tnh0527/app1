# Personalized Admin Dashboard - live on https://www.nexusdb.site/

This repository contains a full-stack web application (Django backend + React frontend) providing a personalized admin/dashboard experience with weather, profiles, subscriptions, and financial data integrations.

## Purpose

The app is a self-hosted dashboard that aggregates weather, profile, calendar scheduling, subscription, and financial data and more into a single admin interface. It is intended for development, testing, and demonstration of integrations and UX patterns. This is for learning and personal use.

## Architecture

- Backend: Django (REST API) serving weather and application data, user management, and integrations.
- Frontend: React (Vite) single-page application with modular components and shared UI primitives.
- Data/storage: PostgreSQL (via Supabase), optional Redis for caching/session use.

## Key Technologies

- Python 3 / Django
- Django REST Framework
- React + Vite
- Moment / moment-timezone
- Mapbox / MapLibre (map rendering)
- Axios (HTTP client)
- Supabase (database / auth options)
- Redis (caching)
- Sentry (error tracking & performance)
- Vercel (frontend hosting, speed monitoring)
- Render (backend hosting)

## Integrations & External APIs

- OpenWeather / Tomorrow.io / VisualCrossing (weather data)
- Geopify (nearby location searches / geocoding)
- Mapbox / MapTiler (map tiles and rendering)
- Supabase (Postgres hosting + migrations)
- Google APIs (Maps/Places/Suggestions/Geocoding/OAuth)
- WAQI (additional air quality index)
- Email (SMTP) for password reset and notifications

## Hosting & Deployment Stack (what this repo uses)

- Backend hosting: Render (service deployment, deploy hooks, and environment sync via GitHub Actions). The Django app runs under Gunicorn behind Render's service runtime. The repository includes a `render-sync.yml` workflow that updates Render environment variables and can trigger a deploy hook.
- Database: Supabase (managed PostgreSQL) is used for the primary database; DB credentials are supplied via environment variables.
- Caching / Session store: Redis (hosted via RedisLabs) is used for caching and session-related data.
- Frontend hosting: Vercel is used for frontend previews and hosting (Vite build output). The frontend also contains a `vercel-build` script and environment variable hooks for integration.
- Support services: SMTP providers for email sending. (nexusdb.notifications@gmail.com)

## Secrets/Variables

- Backend secrets/vars are added to repository and environment secrets/variables, to be synced to Render for backend hosting on workflow run
- Frontend secrets/vars are added to Vercel env vars
