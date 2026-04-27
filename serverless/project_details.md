# SubscriptionSavvy - Project Details

## 1) Project Overview

SubscriptionSavvy is a full-stack web application to track recurring subscriptions, monitor monthly/annual spending, get renewal reminders, and export reports.

The app is built with Next.js (App Router) and uses a single catch-all API route for backend endpoints.  
Authentication is JWT-based with Google OAuth 2.0 sign-in support, and data is stored in Neon Postgres.

Core user value:
- See all subscriptions in one dashboard.
- Know upcoming due dates and urgent renewals.
- Mark payments as paid and automatically move the next billing date.
- Analyze spend by category.
- Export subscription data as CSV/PDF.

---

## 2) Tech Stack and What Is Used

### Frontend
- `Next.js 14` (App Router, client-heavy pages)
- `React 18`
- `Tailwind CSS`
- `shadcn/ui` components (Radix primitives)
- `lucide-react` icons
- `axios` for API calls
- `recharts` for analytics chart
- `date-fns` for date formatting/parsing
- `sonner` for toasts
- `@react-oauth/google` for Google sign-in UI

### Backend
- Next.js Route Handler: `app/api/[[...path]]/route.js`
- Custom JWT implementation (HMAC SHA256 with `crypto`)
- Google token verification via `google-auth-library`
- UUID generation via `uuid`

### Database
- Neon serverless Postgres via `@neondatabase/serverless`
- SQL schema auto-created on first API hit (`ensureSchema()`)

### Tooling / Runtime
- Yarn 1 (`corepack yarn ...`)
- Next standalone output in `next.config.js`

---

## 3) High-Level Architecture

1. User opens app.
2. Root page checks local token (`ss_token`) and redirects:
   - token exists -> `/dashboard`
   - no token -> `/auth`
3. Auth page signs user in with Google OAuth.
4. Frontend sends Google credential to backend endpoint `/api/auth/google`.
5. Backend verifies Google ID token, upserts user in Postgres, returns JWT access token.
6. Token is stored in `localStorage`.
7. Axios interceptor attaches `Authorization: Bearer <token>` to API requests.
8. Protected pages call backend for subscriptions, analytics, reminders, and exports.

---

## 4) Core Features and How They Work

## 4.1 Authentication

### Current primary flow
- Google OAuth 2.0 sign-in from `app/auth/page.js`.
- Google button returns `credential` (ID token).
- Backend verifies token audience (`GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
- User is created or updated in `users` table with `auth_provider='google'` and `google_sub`.
- JWT is generated and returned to frontend.

### Session handling
- JWT is stored as `ss_token` in local storage.
- `components/api.js` injects bearer token in every request.
- Unauthorized responses (`401`) trigger logout redirect to `/auth`.

### Route protection
- `components/protected-route.jsx` blocks access to internal pages when no token is present.

## 4.2 Subscription Management

From `app/subscriptions/page.js`:
- List subscriptions
- Search by name/category
- Add new subscription
- Edit existing subscription
- Delete subscription (with confirmation)

API endpoints used:
- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `PUT /api/subscriptions/:id`
- `DELETE /api/subscriptions/:id`

## 4.3 Reminders and Payment Cycle

From `app/reminders/page.js`:
- Subscriptions are grouped by urgency:
  - overdue
  - due today
  - due tomorrow
  - due this week
  - upcoming
- For items due today, user can click **Mark Paid**.

Backend behavior for mark paid (`POST /api/subscriptions/:id/pay`):
- Computes next billing date:
  - monthly -> +1 month
  - yearly -> +1 year
- Updates subscription `next_payment` and `last_paid`
- Inserts row in `payments` table for audit/history

## 4.4 Dashboard and Analytics

From `app/dashboard/page.js`:
- KPI cards:
  - monthly spend
  - annual spend
  - active subscriptions count
- Category breakdown pie chart
- “Due this week” quick list

Analytics endpoints:
- `GET /api/analytics/summary`
- `GET /api/analytics/category-breakdown`

## 4.5 Export

Backend supports:
- `GET /api/export/csv` -> CSV download
- `GET /api/export/pdf` -> generated PDF report

CSV includes:
- name, category, cost, billing_cycle, next_payment, notes

PDF includes:
- subscription rows and computed monthly/annual totals

---

## 5) Database Design (Neon Postgres)

Schema is created/updated automatically via `ensureSchema()` in API route.

## 5.1 `users`
- `id TEXT PRIMARY KEY`
- `email TEXT UNIQUE NOT NULL`
- `password TEXT` (nullable for Google accounts)
- `auth_provider TEXT NOT NULL DEFAULT 'local'`
- `google_sub TEXT UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

## 5.2 `subscriptions`
- `id TEXT PRIMARY KEY`
- `user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `cost DOUBLE PRECISION NOT NULL`
- `category TEXT NOT NULL`
- `billing_cycle TEXT NOT NULL` (`monthly`/`yearly`)
- `next_payment DATE NOT NULL`
- `notes TEXT NOT NULL DEFAULT ''`
- `active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `last_paid TIMESTAMPTZ`

Index:
- `idx_subscriptions_user_id`

## 5.3 `payments`
- `id TEXT PRIMARY KEY`
- `user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE`
- `amount DOUBLE PRECISION NOT NULL`
- `paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `for_date DATE`

Index:
- `idx_payments_user_id`

---

## 6) API Surface (Catch-All Router)

All backend APIs are implemented in:
- `app/api/[[...path]]/route.js`

Routes:
- `GET /api/` and `GET /api/root` -> health message
- `POST /api/auth/google` -> Google sign-in
- `POST /api/auth/register` -> legacy email/password registration
- `POST /api/auth/login` -> legacy email/password login
- `GET /api/auth/me` -> current user
- `GET /api/subscriptions` -> list user subscriptions
- `POST /api/subscriptions` -> create subscription
- `PUT /api/subscriptions/:id` -> update subscription
- `DELETE /api/subscriptions/:id` -> delete subscription
- `POST /api/subscriptions/:id/pay` -> mark paid + roll next cycle
- `GET /api/analytics/summary` -> totals and count
- `GET /api/analytics/category-breakdown` -> grouped spend
- `GET /api/export/csv` -> CSV report
- `GET /api/export/pdf` -> PDF report

Auth model:
- Bearer token required for all non-auth protected routes.

---

## 7) Environment Variables

Defined in `.env`:
- `DATABASE_URL` -> Neon Postgres connection string
- `NEXT_PUBLIC_BASE_URL` -> app base URL
- `CORS_ORIGINS` -> allowed CORS origins
- `GOOGLE_CLIENT_ID` -> backend audience for Google token verification
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` -> frontend Google OAuth provider client ID

Important:
- `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` should normally be the same client ID.

---

## 8) How the Project Was Built (Implementation Notes)

This project follows a practical full-stack pattern:
- UI pages first (Dashboard, Subscriptions, Reminders, Auth)
- Shared shell/context/components for app-wide behavior
- Single backend route to centralize API and auth logic
- DB abstraction through Neon SQL tagged templates
- Auto schema bootstrap to avoid separate migration tooling for initial setup
- Client token persistence + interceptor-based auth headers

Design decisions:
- Catch-all route keeps backend compact for small-to-medium product scope.
- JWT is custom and lightweight (no heavy auth framework).
- Google OAuth added while preserving compatibility for existing local accounts.
- SQL schema includes backward-compatible `ALTER TABLE` steps for older DB state.

---

## 9) Functional Flow Summary

### New user (Google)
1. Open `/auth`
2. Click Google sign-in
3. Backend verifies token
4. User row upserted
5. JWT issued and stored
6. Redirect to dashboard

### Add subscription
1. User opens `/subscriptions`
2. Creates entry with cost/cycle/date
3. Backend inserts into `subscriptions`
4. Dashboard/analytics update through API reload

### Reminder payment update
1. User opens `/reminders`
2. Clicks “Mark Paid”
3. Backend shifts `next_payment` and logs `payments` row
4. New urgency state is reflected in UI

### Export reports
1. User triggers CSV/PDF export
2. Backend pulls user subscriptions
3. Returns downloadable file response

---

## 10) Scripts and Local Run

From inside `serverless`:

- Install deps:
  - `corepack yarn install`
- Run dev server:
  - `corepack yarn dev`
- Production build:
  - `corepack yarn build`
- Start production server:
  - `corepack yarn start`

---

## 11) Known Notes / Current State

- Google OAuth is implemented and wired in frontend + backend.
- Legacy email/password endpoints still exist for backward compatibility.
- API + frontend rely on token in browser local storage.
- Table creation happens lazily on first API request via `ensureSchema()`.

---

## 12) Project Structure

```text
serverless/
  app/
    api/
      [[...path]]/
        route.js                # Main backend router (auth, CRUD, analytics, exports)
    auth/
      page.js                   # Google sign-in page
    dashboard/
      page.js                   # KPI + chart + due-soon view
    reminders/
      page.js                   # Urgency groups + mark-paid action
    subscriptions/
      page.js                   # Subscription CRUD UI
    globals.css                 # Global styles/theme tokens/animations
    layout.js                   # Root providers + app frame
    page.js                     # Root redirect by auth state

  components/
    api.js                      # Axios instance + auth interceptors
    app-shell.jsx               # Main app layout/chrome
    auth-context.jsx            # User/token state + auth actions
    google-auth-provider.jsx    # Google OAuth provider wrapper
    protected-route.jsx         # Route access guard
    status-badge.jsx            # Due-status logic + badge UI
    subscription-modal.jsx      # Add/edit subscription form
    ui/                         # shadcn/ui component library files

  hooks/
    use-mobile.jsx
    use-toast.js

  lib/
    utils.js

  memory/
  tests/
  test_reports/

  .env
  components.json
  jsconfig.json
  next.config.js
  package.json
  postcss.config.js
  tailwind.config.js
  yarn.lock
  backend_test.py
  test_result.md
  project_details.md
```

---

## 13) One-Line Summary

SubscriptionSavvy is a polished subscription tracking platform built with Next.js + Neon Postgres, featuring Google OAuth authentication, subscription lifecycle management, reminder automation, spend analytics, and downloadable reports.
