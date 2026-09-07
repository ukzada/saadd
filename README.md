# Via Trips API

NestJS backend for **Via Trips** — a bilingual (Arabic/English) travel marketplace where
hotel owners list hotels & rooms and bundle creators publish day-by-day travel bundles.

Built with **NestJS 10 · Prisma 6 · PostgreSQL · JWT (mock) auth · Vercel serverless-ready**.

## Project structure

```
├── api/
│   └── index.js                # Vercel serverless function entry (cached cold-start)
├── prisma/
│   ├── schema.prisma           # Prisma schema (postgresql)
│   └── schema.postgres.prisma  # variant
├── src/
│   ├── main.ts                 # local dev entry (long-running server, port 3001)
│   ├── serverless.ts           # Vercel entry (Express adapter, no listen)
│   ├── app.module.ts
│   ├── auth/                   # JWT auth (mock mode) + FirebaseAuthGuard swap point
│   ├── hotels/ rooms/ bundles/ # core CRUD modules
│   ├── kyc/                    # KYC status + document upload (multer)
│   ├── users/ bookings/ subscriptions/
│   ├── public/                 # public endpoints for mobile apps (no auth)
│   ├── common/                 # GlobalExceptionFilter, RolesGuard, shared-types
│   └── prisma/                 # PrismaService
├── vercel.json                 # build command + rewrite all traffic -> /api/index
└── .env.example                # copy to .env for local development
```

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env            # then edit DATABASE_URL etc.

# 3. Create database tables
npx prisma generate
npx prisma db push

# 4. Run (http://localhost:3001/v1)
npm run dev
```

Requires a PostgreSQL server reachable at your `DATABASE_URL`
(a `docker-compose.yml` with a local Postgres is included).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ (prod) | — | Secret used to sign JWTs — use a long random string |
| `JWT_EXPIRES_IN` | — | `7d` | Token lifetime |
| `MOCK_AUTH` | — | `true` | `true` = local JWT auth; `false` = verify Firebase ID tokens |
| `CORS_ORIGINS` | — | `http://localhost:3000` | Comma-separated allowed origins |
| `API_PREFIX` | — | `v1` | Global route prefix |
| `PORT` | — | `3001` | Local dev port only (Vercel manages its own) |
| `UPLOAD_DIR` | — | `./uploads` | Local upload folder for KYC documents |
| `SEED_DEMO_ACCOUNTS` | — | `true` | Seeds demo users on boot (mock auth only) |

## Deploying to Vercel

The repo is preconfigured for Vercel: `vercel.json` builds with
`prisma generate && nest build` and rewrites all traffic to the serverless
function in `api/index.js`. No framework preset needed.

1. Import `ukzada/saadd` in Vercel.
2. Add environment variables (Production + Preview):
   `DATABASE_URL` (hosted Postgres — e.g. [Neon](https://neon.tech)),
   `JWT_SECRET`, `CORS_ORIGINS`, `MOCK_AUTH=true`.
3. Create the tables once, from your machine:
   ```bash
   DATABASE_URL="your-neon-url" npx prisma db push
   ```
4. Redeploy and check:
   - `GET /` → API status JSON
   - `GET /v1/public/hotels` → public hotel list

> Note: serverless functions have an ephemeral filesystem — KYC file uploads
> (multer, `UPLOAD_DIR`) should be moved to S3/Cloudinary for production.

## Mock auth (dev mode)

With `MOCK_AUTH=true` the backend accepts any email + password (≥6 chars);
unknown emails are auto-created on first login. Demo accounts seeded on boot:

| Email | Password | Role |
|---|---|---|
| `hotel@viatrips.com` | `password123` | HotelOwner |
| `bundle@viatrips.com` | `password123` | BundleCreator |
| `test@hotel.com` | `password` | HotelOwner |
| `test@bundle.com` | `password` | BundleCreator |
| `admin@via.com` | `password` | Admin |

Login/register return `{ token, user }` — send it as `Authorization: Bearer <token>`.

## API endpoints (all under `/v1`)

| Method | Path | Auth | Role |
|---|---|---|---|
| POST | `/auth/login` | — | — |
| POST | `/auth/register` | — | — |
| GET | `/auth/me` | Bearer | — |
| GET | `/user/profile` | Bearer | — |
| PATCH | `/user/profile` | Bearer | — |
| GET | `/public/hotels` · `/public/hotels/:id` | — | — |
| GET | `/public/bundles` · `/public/bundles/:id` | — | — |
| GET | `/hotels` | Bearer | — |
| POST | `/hotels` | Bearer | hotel_owner, admin |
| GET/PATCH/DELETE | `/hotels/:id` | Bearer | owner |
| GET | `/hotels/:hotelId/rooms` | Bearer | — |
| POST | `/hotels/:hotelId/rooms` | Bearer | hotel_owner, admin |
| GET/PATCH/DELETE | `/hotels/:hotelId/rooms/:roomId` | Bearer | owner |
| GET | `/bundles` | Bearer | — |
| POST | `/bundles` | Bearer | bundle_creator, admin |
| GET/PATCH/DELETE | `/bundles/:id` | Bearer | creator |
| GET | `/kyc` | Bearer | — |
| POST | `/kyc/documents` | Bearer (multipart) | — |
| POST | `/kyc/submit` | Bearer | — |

All responses use the standard `ApiResponse<T>` shape:
`{ success, data?, message?, errors?, meta? }`.

## Firebase swap (later)

1. Install `firebase-admin`.
2. Initialise the admin app in `src/main.ts` using `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
3. In `src/auth/firebase-auth.guard.ts`, replace `verifyFirebaseToken()` with
   `admin.auth().verifyIdToken(token)` and look up the user by `firebaseUid`.
4. Set `MOCK_AUTH=false`.

Clients keep sending the same `Authorization: Bearer` header — no client changes needed.
