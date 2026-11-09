# Security Review: Environment Variables

## Scope

This review checked environment files, deployment configuration, frontend source and
build output, server usage, public assets, and ignore rules for exposed secret values.

## Findings

No environment-variable security vulnerabilities were found.

- `server/.env` contains blank secret fields and a local development MongoDB URI.
- `server/.env.example` contains placeholders only.
- `render.yaml` stores deployment secrets through Render environment variables and does
  not contain secret values.
- Frontend code reads only `VITE_API_URL` and `VITE_SOCKET_URL`; no secret variables
  are imported into the browser bundle.
- Server-only credentials are accessed through `process.env`.
- `.gitignore` excludes `.env` files while allowing `.env.example`.
- No credentials, API keys, bearer tokens, private keys, or credentialed database URIs
  were found in `public`, `dist`, or frontend source.

## Earlier credential remediations

- Removed staff demo credentials and autofill behavior from the login page.
- Removed fallback staff passwords from the seed script; required seed password
  variables now fail closed when missing.
- Added startup validation requiring secure `JWT_SECRET` and `PRINT_AGENT_KEY` values.

## Limitations

The workspace has no Git metadata, so this review could not verify whether files were
previously committed or published in repository history. Any credentials previously
used outside this workspace should still be rotated.
