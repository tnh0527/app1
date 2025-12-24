# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## UI capture (Playwright)

This repo includes a Playwright-based screenshot capture to help audit/refactor CSS across the whole app.

### Install

- `npm install`
- `npm run pw:install`

### Capture screenshots

Option A (recommended): let Playwright start Django + Vite for you:

- `npm run capture:ui`

Option B: if you already started servers yourself, run:

- `E2E_NO_SERVER=1 npm run capture:ui`

### Authenticated capture

If you set credentials, the capture will log in via the UI first:

- `E2E_USERNAME=yourUser E2E_PASSWORD=yourPass npm run capture:ui`

Outputs go to:

- `playwright-artifacts/screenshots/*.png`
