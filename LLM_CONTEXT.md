# Repository Guide for Copilot / AI Agents

- Goal: Personalized admin dashboard for quality of life navigation with Django REST backend and React (Vite) frontend.
- Work fast: start in the code paths below; skip generated/output folders already listed in .copilotignore.

## Layout

- backend/app1/manage.py — Django entrypoint.
- backend/app1/app1/settings.py — project settings, CORS, DB config, API keys.
- backend/app1/\*\_app/ — domain apps (auth, profile, schedule, weather, financials, subscriptions, travel).
- frontend/src/ — React app (components, pages, contexts, api clients).
- frontend/tests/ and frontend/playwright-\*/ — Playwright UI capture.

## Backend (Django 5 + DRF)

- Custom user model: auth_app.User (AUTH_USER_MODEL set in settings).
- Env loading: backend/app1/.env via python-dotenv; key vars: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST (default localhost), DB_PORT (default 5432), GOOGLE_API_KEY, OPENWEATHER_API_KEY, TOMORROWIO_API_KEY, VISUALCROSSING_API_KEY, WAQI_KEY, FINNHUB_API_KEY, TWELVE_DATA_API_KEY, IEX_CLOUD_API_KEY, IEX_CLOUD_BASE_URL.
- Services of interest: weather_app/services.py, financials_app/services.py, travel_app/services.py, schedule_app/services.py, subscriptions_app/services.py.
- Run: `cd backend/app1`, optional venv in backend/djangoenv, `pip install -r ../requirements.txt`, `python manage.py migrate`, `python manage.py runserver` (port 8000; CORS allows http://localhost:5173/5174).
- Tests: `python manage.py test` (keeps DB access in mind).

## Frontend (Vite + React 18)

- Entrypoint: frontend/src/main.jsx with app at frontend/src/App.jsx.
- APIs: axios wrapper in frontend/src/api; routes/pages under frontend/src/pages.
- Scripts: `npm install`, `npm run dev` (5173), `npm run build`, `npm run lint`, `npm run capture:ui` (Playwright), `npm run dev:fullstack` (wait-on backend + Vite).

## Search Guidance

- Prioritize: backend/app1/_\_app/views.py, serializers.py, services.py, models.py; frontend/src/\*\*/_.{jsx,js}.
- Deprioritize: generated assets in node_modules, dist, coverage, playwright artifacts, media/static outputs (already ignored).

## Quick facts

- Timezone: UTC; LANGUAGE_CODE en-us.
- Media root: backend/app1/media (ignored for scanning).
- CORS: open to localhost 5173/5174 with credentials allowed.
