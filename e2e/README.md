# E2E Tests — ObjectDock S3 Viewer

End-to-end tests using **Playwright** against a real **MinIO** instance with **10,000+ seeded objects**, **5 levels of nesting**, and **diverse file types/sizes**.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Playwright browsers installed (`npx playwright install chromium`)

## Quick Start

```bash
# 1. Start MinIO and seed test data (10K+ objects, 5 buckets)
npm run e2e:setup

# 2. Run all e2e tests
npm run test:e2e

# 3. Teardown MinIO when done
npm run e2e:teardown
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:unit:watch` | Run unit tests in watch mode |
| `npm run test:unit:coverage` | Run unit tests with coverage report |
| `npm run e2e:setup` | Start MinIO + seed 5 buckets (including 10K objects in bulk-bucket) |
| `npm run e2e:teardown` | Stop MinIO and remove volumes |
| `npm run test:e2e` | Run all e2e tests (API + UI) |
| `npm run test:e2e:api` | Run only API tests |
| `npm run test:e2e:browser` | Run only UI/browser tests |
| `npm run test:e2e:headed` | Run tests with visible browser |
| `npm run test:e2e:ui` | Open Playwright UI mode (interactive) |

## Test Structure

```
e2e/
├── fixtures/
│   ├── auth.ts                   # Login helper, authenticated request context
│   └── constants.ts              # MinIO credentials, bucket names, counts
├── api/                          # API-level tests (18 spec files)
│   ├── auth.spec.ts              # Login, logout, invalid credentials, unauthorized
│   ├── buckets.spec.ts           # List buckets
│   ├── objects.spec.ts           # List objects, pagination, 5-level deep traversal
│   ├── upload.spec.ts            # Presigned upload URL + actual upload
│   ├── download.spec.ts          # Presigned download URL + content verification
│   ├── download-multiple.spec.ts # ZIP download of multiple objects
│   ├── delete.spec.ts            # Delete single/multiple objects
│   ├── mkdir.spec.ts             # Create folder
│   ├── presign.spec.ts           # Shareable presigned URLs
│   ├── head.spec.ts              # Object metadata
│   ├── tags.spec.ts              # Object tag CRUD
│   ├── versions.spec.ts          # Object version listing
│   ├── restore.spec.ts           # Restore object version
│   ├── legalhold.spec.ts         # Object legal hold
│   ├── object-retention.spec.ts  # Object retention
│   ├── bucket-crud.spec.ts       # Create/delete bucket
│   ├── bucket-config.spec.ts     # Bucket versioning, tags, policy, retention
│   └── session.spec.ts           # Session validation, max expiry
├── ui/                           # UI/browser tests (14 spec files)
│   ├── login.spec.ts             # Login form, validation, error messages
│   ├── browse.spec.ts            # Bucket selection, folder navigation, breadcrumbs
│   ├── upload.spec.ts            # File upload via modal
│   ├── download.spec.ts          # File download trigger
│   ├── delete.spec.ts            # Delete confirmation modal
│   ├── search.spec.ts            # Search/filter functionality
│   ├── context-menu.spec.ts      # Right-click context menu
│   ├── high-volume.spec.ts       # 10K objects: 5-level deep navigation, performance
│   ├── metadata-panel.spec.ts    # Object details sidebar
│   ├── file-types.spec.ts        # Diverse file types rendering
│   ├── deep-navigation.spec.ts   # 5-level deep folder navigation
│   ├── create-folder.spec.ts     # Create folder UI
│   ├── bucket-management.spec.ts # Bucket CRUD UI
│   └── share-link.spec.ts        # Share link modal
├── docker-compose.e2e.yml        # MinIO service definition
├── seed-bulk-data.sh             # Seeds 10K+ objects (5 levels deep + diverse types)
├── tsconfig.json                 # TypeScript config for e2e tests
└── README.md                     # This file
```

## Unit Tests

Unit tests use **Vitest** and test server-side logic without requiring MinIO:

```
src/lib/server/
├── session.test.ts    # Session encryption/decryption (13 tests)
└── s3.test.ts         # S3 client functions with mocked AWS SDK (69 tests)
```

## MinIO Test Environment

| Property | Value |
|----------|-------|
| Endpoint | `http://localhost:9000` |
| Console | `http://localhost:9001` |
| Access Key | `minioadmin` |
| Secret Key | `minioadmin` |

### Test Buckets

| Bucket | Contents | Depth |
|--------|----------|-------|
| `test-bucket` | Small set of files and folders for CRUD tests | 3 |
| `bulk-bucket` | 10,000 objects (10×5×5×4×10 hierarchy) | 5 |
| `types-bucket` | ~30 objects: text, JSON, images, binary, code, special names, large files | 2 |
| `empty-bucket` | Empty bucket for edge case tests | 0 |
| `versioned-bucket` | Versioned file (3 versions) + deleted file (delete marker) | 1 |

### Seed Data Details

**bulk-bucket** (5 levels deep):
```
level1-01/ → level2-01/ → level3-01/ → level4-01/ → file-01.txt ... file-10.txt
                                       → level4-04/
                          → level3-05/
             → level2-05/
level1-10/
```

**types-bucket** (diverse file types):
- `text/` — small (100B), medium (10KB), large (1MB), unicode filename
- `json/` — config, array, nested JSON
- `images/` — PNG, JPEG, SVG, GIF (valid file headers)
- `documents/` — Markdown, CSV, XML, CSS
- `binary/` — ZIP archive, random binary (100KB), empty file (0B)
- `code/` — JavaScript, Python, Go, Dockerfile
- `special-names/` — spaces, plus signs, percent, uppercase, hidden, no extension
- `large-files/` — 5MB and 10MB binary files

## CI

Tests run automatically on push to `main` and on pull requests via GitHub Actions. The workflow:

1. Runs unit tests (Vitest)
2. Starts MinIO via docker-compose
3. Seeds 10,000+ test objects across 5 buckets
4. Runs all Playwright tests
5. Uploads the HTML report as an artifact on failure

## Debugging Failed Tests

```bash
# Run a specific test file
npx playwright test e2e/api/auth.spec.ts

# Run with headed browser for debugging
npx playwright test e2e/ui/login.spec.ts --headed

# Open interactive UI mode
npm run test:e2e:ui

# View last test report
npx playwright show-report

# Run unit tests in watch mode
npm run test:unit:watch
```
