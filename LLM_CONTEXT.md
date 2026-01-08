# Repository Guide for Copilot / AI Agents

- Goal: Personalized admin dashboard with Django REST backend and React (Vite) frontend.
- Work fast: start in the files below; ignore generated/output folders noted in .copilotignore.

## Quick Start

- Backend: `cd backend/app1 && pip install -r ../requirements.txt && python manage.py migrate && python manage.py runserver` (port 8000). Optional venv at backend/djangoenv.
- Frontend: `cd frontend && npm install && npm run dev` (Vite 5173). Fullstack helper: `npm run dev:fullstack` (wait-on backend + Vite).
- Tests: backend `python manage.py test`; frontend `npm run lint`; UI capture `npm run capture:ui` / `npm run capture:ui:headed`.

## Layout (paths to know)

- backend/app1/manage.py — Django entrypoint; settings live in backend/app1/app1/settings.py.
- backend/app1/\*\_app/ — domain apps: auth, profile, schedule, weather, financials, subscriptions, travel.
- backend/app1/app1/urls.py — mounts auth/, profile/, events/, api/ (weather), api/financials/, api/subscriptions/, api/travel/.
- frontend/src/ — React app (components, pages, contexts, api clients); tests/playwright-\* hold UI capture artifacts.

## Backend (Django 5.1 + DRF)

- Auth: Custom user `auth_app.User` with session authentication; default permission IsAuthenticated. Throttles: anon 100/hour, user 1000/hour, login 10/min.
- DB: PostgreSQL via env (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST=localhost, DB_PORT=5432). Session engine db-backed.
- Env loading: `.env` plus optional `.env.local` when `LOAD_LOCAL_DOTENV=true`.
- CORS/CSRF: localhost 5173/5174 allowed with credentials; CSRF/Session cookies set to Lax when DEBUG=True.
- Static/Media: STATIC_ROOT backend/app1/staticfiles served by WhiteNoise; MEDIA_ROOT backend/app1/media.
- Caching: LocMem cache `weather-cache`, default TTL 15m; per-type TTLs in `WEATHER_CACHE_TTL` (forecast 15m, current 5m, AQI 30m, geocode/timezone 24h).
- Logging: console in DEBUG; file at backend/app1/logs/django.log with rotation in non-debug.
- Security toggles via env: SECRET_KEY, DEBUG, ALLOWED_HOSTS, SECURE_SSL_REDIRECT, SESSION/CSRF cookie secure flags, COOKIE_DOMAIN.

### Weather service

- Core logic in backend/app1/weather_app/services.py: multi-API fallback chain (Open-Meteo → Tomorrow.io → VisualCrossing → OpenWeather) with caching and normalization; WAQI for AQI with Open-Meteo AQ fallback; geocode/timezone helpers cached.
- Proxies keep API keys server-side: Geoapify autocomplete/routing/places, Mapbox geocode, OpenWeather proxy/tile config, WAQI proxy, general places autocomplete.
- API routes (mounted at /api/): `/weather/` main fetch; `/weather/api-status/`; `/place/`; saved locations CRUD/reorder/set-primary; proxy endpoints under `/proxy/...`.

### Other domain apps (high level)

- auth_app: auth routes under /auth/; custom user model.
- profile_app: profile data and signals.
- schedule_app: events under /events/.
- financials_app: mounted at /api/financials/ (stocks/finance integrations).
- subscriptions_app: /api/subscriptions/ for billing/subscription flows.
- travel_app: /api/travel/ for travel-related data/services.

### Dependencies (backend)

- Django 5.1.2, djangorestframework 3.15.2, django-cors-headers, python-dotenv/decouple, requests, psycopg2-binary, gunicorn, whitenoise, dj-database-url.

## Frontend (React 18 + Vite)

- Entrypoint: frontend/src/main.jsx → App.jsx. Axios wrapper under frontend/src/api.
- Scripts: dev, build, lint, preview, Playwright capture, dev:fullstack helper; pw:install installs browsers.
- Key deps: axios; react-router-dom; react-bootstrap + bootstrap/bootstrap-icons; chart.js + financial plugin; mapbox-gl/maplibre-gl; @googlemaps/js-api-loader; date-holidays; moment-timezone; react-hook-form; react-helmet; react-spinners; react-tooltip. Dev: @playwright/test, eslint 9, tailwindcss 4, vite 6.
- Assets: public/ and static videos; Playwright artifacts under frontend/playwright-artifacts.

## Search Guidance

- Prioritize: backend/app1/_\_app/{views,serializers,services,models}.py and frontend/src/\*\*/_.{jsx,js}.
- Deprioritize: node_modules, dist, coverage, playwright artifacts, media/static outputs.

## Operational Notes

- Ports: backend 8000, frontend 5173 (5174 also allowed).
- API keys pulled from .env: GOOGLE_API_KEY/GOOGLE_CLOUD_API_KEY/GOOGLE_OAUTH_CLIENT_ID; OPENWEATHER_API_KEY, TOMORROWIO_API_KEY, VISUALCROSSING_API_KEY, WAQI_KEY; GEOAPIFY_API_KEY, MAPBOX_ACCESS_TOKEN, MAPTILER_API_KEY; FINNHUB_API_KEY, TWELVE_DATA_API_KEY, IEX_CLOUD_API_KEY, IEX_CLOUD_BASE_URL.
- Caching already enabled for weather; swapping to Redis only requires CACHES backend change.
