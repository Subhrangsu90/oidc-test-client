# OIDC Test Client

This is a minimal OIDC relying-party client for testing the local provider running from `my-oidc-auth`.

## Structure

```text
public/
  styles.css
src/
  app/
  config/
  index.js
```

- `src/index.js` starts the server
- `src/config` loads environment variables
- `src/app` holds routes, handlers, templates, and session logic
- `public/styles.css` keeps the page styling separate from server code

## Configure

1. Copy `.env.example` to `.env`
2. Fill in:
   - `CLIENT_ID`
   - `CLIENT_SECRET`
   - `REDIRECT_URI`

The default setup expects:

- provider: `http://localhost:8000`
- client: `http://localhost:3000`
- callback: `http://localhost:3000/callback`

## Run

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Flow

- `/login` redirects to the provider authorize endpoint
- `/callback` exchanges the code for tokens
- `/home` shows the signed-in user
- `/logout` clears the local session
