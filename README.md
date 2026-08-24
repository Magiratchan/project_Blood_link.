# BloodLink — AI-Powered Emergency Blood Coordination

> Find the Right Blood. When Every Minute Matters.

BloodLink is an AI-assisted emergency blood coordination platform that connects hospitals with suitable donors faster. It combines transparent AI donor ranking, automatic donor-chain fallback, real-time inventory, demand analytics, and shortage prediction into a single decision-support system.

> ⚠️ **Healthcare disclaimer:** BloodLink is an AI-assisted coordination and decision-support platform. It does not diagnose patients, determine final donor eligibility, guarantee blood compatibility, or replace qualified healthcare professionals or authorized blood banks. All transfusion decisions and compatibility testing must be performed by qualified professionals.

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Database Setup](#database-setup)
6. [Neon PostgreSQL Setup](#neon-postgresql-setup)
7. [Environment Variables](#environment-variables)
8. [Local Development](#local-development)
9. [Database Migration & Seed](#database-migration--seed)
10. [Demo Credentials](#demo-credentials)
11. [API Overview](#api-overview)
12. [AI Matching Explanation](#ai-matching-explanation)
13. [Main Demo Path](#main-demo-path)
14. [Vercel Deployment](#vercel-deployment)
15. [Safety Disclaimer](#safety-disclaimer)

---

## Overview

BloodLink helps hospitals and authorized users quickly find suitable blood donors during emergencies. The platform provides:

- **Role-based access** for Donors, Hospitals, Blood Banks, and Admins.
- **AI-assisted donor matching** with an explainable, transparent scoring engine.
- **Donor-chain fallback** — if a donor declines, the next ranked donor is engaged automatically.
- **Location-aware matching** using OpenStreetMap + Leaflet.
- **Blood inventory management** for blood banks.
- **Demand analytics** with historical synthetic data.
- **Shortage prediction** using a lightweight statistical forecasting model.

All demo data is **synthetic** and clearly labelled as such.

---

## Features

### Donor
- Register, login, create profile (blood group, approximate location, availability).
- Availability toggle.
- View nearby emergency requests compatible with their blood group.
- Accept / decline requests.
- View notifications, donation history, and response history.

### Hospital
- Create emergency blood requests (blood group, units, urgency, deadline, location).
- Run AI matching → view ranked compatible donors with match scores.
- Visualize the donor chain (notified → viewed → accepted / declined / expired).
- Simulate donor responses for demo (decline top → chain advances → accept next).
- Track request status to FULFILLED.
- Find-donors browser with map + filters.

### Blood Bank
- View and update blood inventory per blood group.
- View regional inventory and low-stock alerts.
- View shortage predictions and recommendations.
- View active emergency requests.

### Admin
- View all users, hospitals, blood banks.
- Verify / reject / suspend users.
- Review audit logs and suspicious activity.
- System statistics.

### Shared
- Analytics dashboard (demand over time, by blood group, by region, inventory, shortage risk).
- Notifications panel.
- Shortage prediction panel.

---

## Architecture

```
Browser (single-page app on /)
   │  fetch (same-origin, httpOnly session cookie)
   ▼
Next.js API routes (/api/*)
   │
   ├── /api/auth/*         — register, login, logout, me
   ├── /api/dashboard      — role-aware aggregated data
   ├── /api/donors/*       — list, nearby, compatible, respond
   ├── /api/blood-requests  — CRUD
   ├── /api/matching/*     — run + results
   ├── /api/inventory       — read/update
   ├── /api/analytics/*     — demand, inventory, overview
   ├── /api/predictions/*   — shortage prediction
   ├── /api/notifications   — read/mark-read
   ├── /api/users           — admin user management
   └── /api/demo/seed       — re-seed demo data
   │
   ▼
Services (src/lib)
   ├── auth.ts             — session + bcrypt + role guards
   ├── blood/compatibility.ts — single source of truth (ABO/Rh)
   ├── matching/donor-matching.ts — AI scoring engine
   ├── matching/distance.ts — Haversine
   ├── ai/prediction.ts    — shortage forecasting (statistical-v1)
   ├── notifications/*     — in-app + FCM integration point
   └── audit.ts            — audit log + rate limiter
   │
   ▼
Prisma ORM → Database (SQLite local / Neon PostgreSQL production)
```

The frontend is a **single-page app** rendered on the `/` route (per the sandbox
constraint). Client-side view routing (Zustand) switches between landing,
auth, and role dashboards.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM (SQLite local / Neon PostgreSQL production) |
| Auth | Custom session (bcrypt + httpOnly cookie) |
| Maps | OpenStreetMap + Leaflet |
| Charts | Recharts |
| State | Zustand (client) |
| AI | Transparent scoring engine + statistical forecasting (modular — external ML pluggable) |

> **Note on DB provider:** The local sandbox runs on **SQLite** for zero-config startup. The schema is designed to be PostgreSQL-compatible. To deploy on Neon PostgreSQL, change the Prisma datasource `provider` to `"postgresql"` and set `DATABASE_URL` to the Neon connection string (see [Neon setup](#neon-postgresql-setup)).

---

## Database Setup

The schema defines 14 models:

- **User** / **Session** — auth & accounts
- **Donor** / **Hospital** / **BloodBank** — role profiles
- **BloodRequest** — emergency requests
- **MatchingResult** — AI-ranked donor results (with score breakdown)
- **NotificationEvent** — donor-chain events (SENT/VIEWED/ACCEPTED/DECLINED/EXPIRED)
- **Donation** — donation records
- **BloodInventory** — blood bank stock
- **DemandHistory** — historical synthetic demand
- **ShortagePrediction** — computed shortage forecasts
- **Notification** — in-app notifications
- **AuditLog** — audit trail

All models use UUID/cuid primary keys, `createdAt`/`updatedAt`, indexes on
`bloodGroup`, `availability`, `requestStatus`, `urgency`, `hospitalId`,
`donorId`, `region`, and `createdAt`.

---

## Neon PostgreSQL Setup

1. Create a project at [neon.tech](https://neon.tech) (free tier available).
2. Copy the connection string.
3. Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"   // change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
4. Set `DATABASE_URL` in `.env` to the Neon connection string:
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/bloodlink?sslmode=require"
   ```
5. Run:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | SQLite path (local) or Neon PostgreSQL URL (production) |
| `AUTH_SECRET` | yes | Secret for signing session cookies |
| `NODE_ENV` | yes | `development` / `production` |
| `NEXT_PUBLIC_APP_URL` | no | Public app URL |
| `SNOWFLAKE_*` | no | Optional analytics export |
| `FCM_*` | no | Optional push notifications |

**Never** commit real secrets. The repo includes `.env.example` only.

---

## Local Development

```bash
# 1. Install dependencies
bun install   # or npm install

# 2. Configure environment
cp .env.example .env
#   - set DATABASE_URL (default works for local SQLite)
#   - set AUTH_SECRET

# 3. Push schema + seed
bun run db:push     # create tables
bun run db:seed     # load demo data (~115 donors, demand history, inventory, predictions)

# 4. Start dev server
bun run dev         # http://localhost:3000

# 5. Lint
bun run lint
```

---

## Database Migration & Seed

```bash
bun run db:generate   # regenerate Prisma client
bun run db:push       # push schema (SQLite)
bun run db:migrate    # create + apply migration (PostgreSQL)
bun run db:seed       # seed synthetic demo data
bun run db:reset      # reset (destructive)
```

The seed is idempotent (wipes + recreates) and generates:
- 110+ donors across 5 regions with realistic ABO/Rh distribution
- 5 showcase O− donors placed at controlled distances (1.2–9 km) from the demo hospital for a rich matching demo
- 2 hospitals, 1 blood bank, 1 admin
- Blood inventory (8 groups, O− intentionally low for the shortage demo)
- 90 days × 5 regions × 8 blood groups = ~3600 synthetic demand records
- 40 shortage predictions (computed from demand + inventory)
- 4 emergency requests in varied states

---

## Demo Credentials

All accounts share password **`demo1234`**. Use the one-click demo buttons on the landing page or login manually:

| Role | Email | Notes |
|---|---|---|
| Hospital | `hospital@bloodlink.app` | Thanjavur Medical College Hospital |
| Donor | `donor@bloodlink.app` | Demo Donor One (O−) |
| Blood Bank | `bloodbank@bloodlink.app` | Thanjavur Govt Blood Bank |
| Admin | `admin@bloodlink.app` | System Administrator |

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (DONOR / HOSPITAL / BLOOD_BANK) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user + profile |
| GET | `/api/dashboard` | Role-aware dashboard data |
| GET | `/api/donors` | List donors (hospital/bb/admin only) |
| GET | `/api/donors/nearby` | Donors sorted by distance |
| GET | `/api/donors/compatible` | Compatible donors for a recipient group |
| GET/PATCH | `/api/donors/[id]` | Donor profile / update availability |
| POST | `/api/donors/[id]/respond` | Donor accept/decline (drives donor chain) |
| GET/POST | `/api/blood-requests` | List / create requests |
| GET/PATCH | `/api/blood-requests/[id]` | Request detail / status update / fulfill / cancel |
| POST | `/api/matching/run` | Run AI matching + notify top donors |
| GET | `/api/matching/[requestId]` | Matching results + donor chain |
| GET/POST | `/api/inventory` | Inventory read / update |
| GET | `/api/analytics/demand` | Demand history series |
| GET | `/api/analytics/inventory` | Inventory + totals |
| GET | `/api/analytics/overview` | KPI cards |
| GET | `/api/predictions/shortage` | Shortage predictions |
| GET/PATCH | `/api/notifications` | Notifications / mark read |
| GET/PATCH | `/api/users` | Admin user management |
| POST | `/api/demo/seed` | Re-seed demo data |

---

## AI Matching Explanation

BloodLink's donor matching is a **transparent, explainable scoring engine** — not a black-box model. It is labelled throughout the UI as *"AI-assisted donor matching score"*.

### Pipeline

1. **Compatibility filter (mandatory)** — incompatible blood groups removed using the centralized `bloodCompatibilityService`.
2. **Availability filter** — unavailable donors removed.
3. **Deferral filter** — donors who donated within the last 56 days removed.
4. **Scoring** (configurable weights, total = 100):

| Dimension | Max | What it measures |
|---|---|---|
| Distance Score | 30 | Haversine distance from hospital (closer = higher) |
| Availability Score | 25 | Available + donation readiness (freshness of last donation) |
| Urgency Score | 20 | Readiness for the request's urgency level |
| Response Reliability | 25 | Historical response rate |

5. **Ranking** — donors sorted by total match score.
6. **Explanation** — each result ships with a plain-language recommendation reason.

Weights are configurable in `src/lib/types.ts` (`MATCH_WEIGHTS`).

### Why transparent?

Every recommendation shows the score breakdown (distance / availability / urgency / response sub-scores) and a human-readable reason, e.g.:

> *Highly suitable — exact blood-group match, located very close to the hospital, strong historical response rate, well-suited for critical urgency.*

The architecture is modular — an external ML model can be wired in by replacing the scoring function in `src/lib/matching/donor-matching.ts`.

### Shortage prediction

The `shortagePredictionService` (`src/lib/ai/prediction.ts`) uses a statistical-v1 approach:
1. Pulls recent demand history for region + blood group.
2. Computes a 14-day rolling mean + linear trend slope.
3. Forecasts next 7 days expected demand.
4. Compares against current inventory → shortage risk (0–100%).
5. Emits a recommendation and confidence.

Clearly labelled as decision-support only — not medically validated.

---

## Main Demo Path

The polished end-to-end flow for judges:

1. **Login** as Hospital (one-click demo button).
2. **Open the O− CRITICAL request** (pre-seeded PENDING).
3. **Run AI Matching** → 6 ranked donors + 5 notified in the chain + map.
4. **Decline the top donor** → chain shows DECLINED.
5. **Accept the second donor** → ACCEPTED + SELECTED, others EXPIRED.
6. **Request → DONOR_FOUND** → green banner.
7. **Mark Fulfilled** → FULFILLED with success banner.
8. **View Analytics** → demand / inventory / shortage risk charts.
9. **View Shortage Prediction** → O− Thanjavur high-risk forecast.

You can also **Create Emergency Request** → "Create & Run AI Matching" to demonstrate the full flow from scratch.

---

## Vercel Deployment

1. Push the repo to GitHub.
2. Import into [Vercel](https://vercel.com).
3. Set environment variables (`DATABASE_URL`, `AUTH_SECRET`, `NODE_ENV=production`).
4. For Neon: set the Neon PostgreSQL `DATABASE_URL` and switch the Prisma provider to `postgresql` (see [Neon setup](#neon-postgresql-setup)).
5. Add the build command `prisma generate && next build` if Prisma generate isn't picked up automatically.
6. Deploy.

The app works fully with Next.js + Neon + Vercel. **Snowflake is optional** — when not configured, the app runs without it.

---

## Safety Disclaimer

> BloodLink is an AI-assisted coordination and decision-support platform. It does not diagnose patients, determine final donor eligibility, guarantee blood compatibility, or replace qualified healthcare professionals or authorized blood banks. All transfusion decisions and compatibility testing must be performed by qualified professionals.

This disclaimer is displayed throughout the application (landing page footer, dashboard sidebar, request detail, matching results, analytics, and prediction panels).

---

## Project Structure

```
prisma/
  schema.prisma        # 14 models, PostgreSQL-compatible
  seed.ts              # entry → src/lib/seed.ts
src/
  app/
    page.tsx           # single-page app root
    layout.tsx         # metadata + fonts
    api/               # all API routes
  components/
    bloodlink/
      BloodLinkApp.tsx        # SPA router
      Landing.tsx             # marketing landing
      AuthModal.tsx           # login/register + demo accounts
      DashboardShell.tsx      # sidebar + topbar
      ui/                     # badges, cards, format, disclaimer
      maps/DonorMap.tsx       # Leaflet component
      donor/                  # DonorDashboard
      hospital/               # HospitalDashboard, MatchingResults, DonorChain, ...
      bloodbank/              # BloodBankDashboard
      admin/                 # AdminDashboard
      analytics/             # AnalyticsPanel, PredictionsPanel
  lib/
    types.ts             # shared constants + types
    auth.ts              # session + role guards
    db.ts                # Prisma client
    seed.ts              # demo data generator
    audit.ts             # audit log + rate limiter
    blood/compatibility.ts     # bloodCompatibilityService
    matching/donor-matching.ts # donorMatchingService
    matching/distance.ts        # haversine
    ai/prediction.ts            # shortagePredictionService
    notifications/notifications.ts
    api/hooks.ts                # useApi + apiCall
    client-types.ts             # frontend types
  stores/
    app-store.ts         # Zustand client state
```

---

## License

Hackathon demo project. All data is synthetic. Not for medical use.
