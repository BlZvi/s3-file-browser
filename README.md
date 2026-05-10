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

## Deployment

### Docker Compose

See [Quick Start](#quick-start) above for `docker compose` usage.

### Container Image

Pre-built multi-arch Docker images (amd64 + arm64) are published to GitHub Container Registry on every push to `main` and on version tags:

```bash
docker pull ghcr.io/OWNER/s3-viewer:latest
```

No authentication required — images are publicly available.

Available tags:
- `latest` — latest build from `main` branch
- `x.y.z` — specific version (e.g., `1.0.0`)
- `x.y` — minor version (e.g., `1.0`)
- `<sha>` — specific commit SHA

### Kubernetes (Helm)

A Helm chart is included for deploying to Kubernetes clusters (including k3s).

#### Quick Start

```bash
helm install s3-viewer ./chart \
  --set secrets.SESSION_SECRET="your-secret-here-min-32-chars!!" \
  --set env.ORIGIN="https://s3-viewer.example.com"
```

#### With Ingress (k3s / Traefik)

```bash
helm install s3-viewer ./chart \
  --set secrets.SESSION_SECRET="your-secret-here-min-32-chars!!" \
  --set env.ORIGIN="https://s3-viewer.example.com" \
  --set ingress.enabled=true \
  --set ingress.className=traefik \
  --set ingress.hosts[0].host=s3-viewer.example.com \
  --set ingress.hosts[0].paths[0].path=/ \
  --set ingress.hosts[0].paths[0].pathType=Prefix
```

#### With Fixed S3 Credentials (skip login form)

```bash
helm install s3-viewer ./chart \
  --set secrets.SESSION_SECRET="your-secret-here-min-32-chars!!" \
  --set secrets.S3_ACCESS_KEY="your-access-key" \
  --set secrets.S3_SECRET_KEY="your-secret-key" \
  --set env.S3_ENDPOINT="https://s3.amazonaws.com" \
  --set env.ORIGIN="https://s3-viewer.example.com"
```

#### Using a Custom Values File

Create a `my-values.yaml`:

```yaml
image:
  repository: ghcr.io/OWNER/s3-viewer
  tag: latest

ingress:
  enabled: true
  className: traefik
  hosts:
    - host: s3-viewer.example.com
      paths:
        - path: /
          pathType: Prefix

env:
  ORIGIN: "https://s3-viewer.example.com"
  S3_DEFAULT_ENDPOINT: "https://minio.internal:9000"
  S3_DEFAULT_REGION: "us-east-1"

secrets:
  SESSION_SECRET: "your-secret-here-min-32-chars!!"
```

Then install:

```bash
helm install s3-viewer ./chart -f my-values.yaml
```

#### Using an Existing Secret

If you prefer to manage secrets externally (recommended for production):

```bash
kubectl create secret generic s3-viewer-secrets \
  --from-literal=SESSION_SECRET="your-secret-here" \
  --from-literal=S3_ACCESS_KEY="your-key" \
  --from-literal=S3_SECRET_KEY="your-secret"

helm install s3-viewer ./chart \
  --set existingSecret=s3-viewer-secrets \
  --set env.ORIGIN="https://s3-viewer.example.com"
```

#### Chart Values Reference

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Container image repository | `ghcr.io/OWNER/s3-viewer` |
| `image.tag` | Image tag (defaults to appVersion) | `""` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `3000` |
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `env.ORIGIN` | External URL of the app | `http://localhost:3000` |
| `env.S3_DEFAULT_ENDPOINT` | Pre-fill S3 endpoint in login | `""` |
| `env.S3_DEFAULT_REGION` | Pre-fill S3 region in login | `us-east-1` |
| `secrets.SESSION_SECRET` | Session encryption secret | `""` (required) |
| `secrets.S3_ACCESS_KEY` | Fixed S3 access key | `""` |
| `secrets.S3_SECRET_KEY` | Fixed S3 secret key | `""` |
| `existingSecret` | Use existing K8s Secret | `""` |
| `autoscaling.enabled` | Enable HPA | `false` |
| `resources` | CPU/memory resource limits | `{}` |

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
