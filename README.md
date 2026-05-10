# S3 File Browser

Web-based file manager for any S3-compatible storage (AWS, MinIO, Backblaze B2, DigitalOcean Spaces, Ceph, etc.).

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## Quick Start

```bash
# Start app + MinIO (for testing)
docker compose up -d

# Open http://localhost:3000
# Login: minioadmin / minioadmin
# Endpoint: http://minio:9000 | Region: us-east-1
```

Or run standalone:

```bash
docker run -p 3000:3000 \
  -e SESSION_SECRET=$(openssl rand -base64 48) \
  -e ORIGIN=http://localhost:3000 \
  s3-viewer
```

## Configuration

Copy [`.env.example`](.env.example) and adjust for your environment. Key variables:

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | **Required in production.** Encryption key for session cookies (AES-256-GCM). |
| `ORIGIN` | Public URL of the app. Must match for CSRF protection to work. |
| `S3_DEFAULT_ENDPOINT` | Pre-fills the endpoint field on the login form. |
| `S3_ACCESS_KEY` + `S3_SECRET_KEY` | Enables fixed credentials mode (skips login). |
| `OIDC_ISSUER` + `OIDC_CLIENT_ID` + `OIDC_CLIENT_SECRET` | Enables SSO login via OpenID Connect. |

### Auth Modes

**Manual credentials** (default) — users enter their own S3 access key, secret, endpoint, and region.

**Fixed credentials** — set `S3_ACCESS_KEY` and `S3_SECRET_KEY` env vars. Login is skipped; all users share the same S3 session. Only use behind a VPN or auth proxy.

**OIDC / SSO** — set `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`. Works with Keycloak, Okta, Authentik, Azure AD, Google, etc. Callback URL: `https://<your-domain>/api/auth/oidc/callback`. Can be combined with fixed credentials (SSO gate + shared S3 access) or manual credentials (SSO gate + per-user S3 keys).

## Features

- Browse buckets and objects with breadcrumb navigation
- Upload (drag & drop, multipart for large files), download, delete
- Create folders, copy/move/rename objects
- Share files via presigned URLs with configurable expiry
- Search (recursive), version history, object tagging
- Bucket management, CORS editor, retention policies
- Bookmarks, dark mode, keyboard shortcuts (command palette)
- ~50MB Docker image (Node 22 Alpine, multi-stage build)

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Validate credentials & create session |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/session` | Get current session info |
| GET | `/api/auth/oidc/login` | Initiate OIDC login flow |
| GET | `/api/auth/oidc/callback` | OIDC callback |
| GET | `/api/s3/buckets` | List buckets |
| GET | `/api/s3/objects` | List objects in a bucket/prefix |
| GET | `/api/s3/download` | Get presigned download URL |
| POST | `/api/s3/upload` | Get presigned upload URL |
| POST | `/api/s3/delete` | Delete object(s) |
| POST | `/api/s3/mkdir` | Create folder |
| POST | `/api/s3/presign` | Generate shareable presigned URL |
| POST | `/api/s3/copy` | Copy/move objects |
| GET | `/api/s3/head` | Get object metadata |
| GET | `/api/s3/versions` | List object versions |
| GET | `/api/s3/search` | Recursive object search |
| GET/PUT/DELETE | `/api/s3/tags` | Object tagging |
| GET/PUT/DELETE | `/api/s3/buckets/cors` | CORS configuration |
| GET | `/health` | Health check |

## Security

- Credentials encrypted with AES-256-GCM, stored in HttpOnly/SameSite=Strict cookies
- No database — all state lives in the encrypted session cookie
- File transfers use presigned URLs (browser ↔ S3 directly, not proxied through the server)
- Sessions expire after 8 hours
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) on all responses
- `SESSION_SECRET` must be a strong random string in production (`openssl rand -base64 48`)
- Deploy behind a reverse proxy (Nginx, Traefik, Caddy) for TLS and rate limiting

## Development

```bash
# Start MinIO
docker compose -f docker-compose.dev.yml up -d

# Install & run
npm install
npm run dev
# → http://localhost:5173 (minioadmin / minioadmin, endpoint: http://localhost:9000)
```

## License

MIT
