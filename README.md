# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# deploy test 2026-03-24 22:29:05
deploy test 2026-03-24 22:29:49
deploy retry 2026-03-24 22:33:52
deploy retry 2026-03-24 22:36:19

## Backend security API

Added Flask security module for server-side user management:

- User database is stored in SQLite file: `portal/data/users.db`.
- Admin credentials are stored in separate server file: `portal/data/admin_credentials.json`.
- Admin API auth uses headers: `X-Admin-Login` and `X-Admin-Password`.

Endpoints:

- `POST /api/security/admin/login`
- `PUT /api/security/admin/credentials`
- `GET /api/security/users`
- `POST /api/security/users`
- `PUT /api/security/users/<id>`
- `DELETE /api/security/users/<id>`

You can override default paths and initial admin credentials via env vars:

- `SECURITY_DATA_DIR`
- `USERS_DB_PATH`
- `ADMIN_CREDENTIALS_PATH`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`

## Nextcloud Talk schedule confirmation integration

Added backend module for doctor directory and schedule confirmations via Nextcloud Talk bot.

### New API endpoints

- `GET /api/talk/doctors`
- `GET /api/talk/doctors/<doctor_id>`
- `POST /api/talk/doctors`
- `PUT /api/talk/doctors/<doctor_id>`
- `DELETE /api/talk/doctors/<doctor_id>`
- `POST /api/talk/doctors/<doctor_id>/room`
- `POST /api/talk/schedule/request-confirmation`
- `POST /api/talk/internal/send-schedule-to-talk`
- `GET /api/talk/schedule/confirmations`
- `POST /api/talk/schedule-response` (Bearer auth via `PORTAL_CALLBACK_BEARER`)

### Database tables (SQLite `portal/data/talk.db` by default)

- `doctors`
- `schedule_confirmations`
- `schedule_confirmation_events`

### Env vars

- `NEXTCLOUD_BASE_URL`
- `NEXTCLOUD_BOT_ID`
- `NEXTCLOUD_BOT_NAME`
- `NEXTCLOUD_BOT_SECRET`
- `BOT_SERVICE_BASE_URL`
- `PORTAL_CALLBACK_BEARER`

### Production notes (critical)

- Do not use a placeholder secret (`changeme...`) for `NEXTCLOUD_BOT_SECRET`; use a strong random value in production.
- Do not test portal callback from bot with `127.0.0.1` inside a container. For Docker this is container-local loopback, not the host/portal.
- Use either:
  - an external portal URL (for example `https://portal.docdenisenko.ru/api/talk/schedule-response`), or
  - a dedicated service URL in the same Docker network.
