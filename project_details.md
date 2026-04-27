# SubscriptionSavvy - Project Details

## 1) What this project is

`SubscriptionSavvy` is a full-stack subscription tracking application that helps a user:
- register/login securely,
- add and manage recurring subscriptions,
- monitor upcoming/overdue payments,
- view spending analytics,
- export data as CSV/PDF.

The project is split into:
- a **React + Vite frontend** in `frontend-react`,
- a **Flask + SQLAlchemy backend API** in `backend`.

It is a personal-finance productivity app focused on subscription visibility and payment awareness.

---

## 2) High-level architecture

## Frontend
- Single-page app (SPA) built with React.
- Uses `react-router-dom` for route-level screens.
- Uses Axios for API communication.
- Stores JWT access token in `localStorage`.
- Uses `react-chartjs-2` + `chart.js` for dashboard visualization.

## Backend
- Flask app factory pattern (`create_app`).
- SQLAlchemy ORM for `User` and `Subscription` models.
- JWT authentication with `flask-jwt-extended`.
- CORS enabled for browser frontend access.
- REST API grouped into:
  - `auth` blueprint (`/api/auth/...`)
  - main API blueprint (`/api/...`)

## Data flow (typical)
1. User signs in from frontend form.
2. Backend validates credentials and returns access + refresh tokens.
3. Frontend stores access token and sends it in `Authorization: Bearer <token>`.
4. Protected API routes use JWT identity to scope data to the logged-in user.
5. UI updates state from API responses.

---

## 3) Core domain and data model

## `User`
- `id` (PK)
- `email` (unique)
- `password_hash`
- `created_at`
- Has one-to-many relationship with `Subscription`.

Passwords are hashed via Werkzeug (`generate_password_hash` / `check_password_hash`).

## `Subscription`
- `id` (PK)
- `user_id` (FK -> users.id)
- `name`
- `cost` (`Numeric(10,2)`)
- `category`
- `billing_cycle` (`monthly` or `yearly`)
- `next_payment` (date)
- `notes`
- `created_at`

Model helpers:
- `monthly_cost()` normalizes yearly plans to monthly equivalent.
- `annual_cost()` normalizes monthly plans to annual equivalent.
- `is_due_within(days)` checks payment horizon for reminder logic.

---

## 4) Implemented features

## 4.1 Authentication
- User registration (`/api/auth/register`)
  - Requires email + password.
  - Prevents duplicate email registration.
- User login (`/api/auth/login`)
  - Verifies password hash.
  - Returns access and refresh JWT tokens.
- Token refresh (`/api/auth/refresh`)
- Current user profile (`/api/auth/me`)

Frontend handling:
- `AuthContext` validates existing token on app load.
- Protected routes redirect unauthenticated users to `/auth`.
- Logout clears token and session state.

## 4.2 Subscription CRUD
- List all current user's subscriptions (`GET /api/subscriptions`), sorted by nearest payment.
- Create subscription (`POST /api/subscriptions`).
- Update subscription (`PUT /api/subscriptions/<id>`).
- Delete subscription (`DELETE /api/subscriptions/<id>`).

Frontend handling:
- Dedicated subscriptions page with list layout.
- Add/edit modal form with category, cycle, date, notes.
- Edit and delete actions per row.

## 4.3 Payment progression logic ("Mark as Paid")
- Endpoint: `POST /api/subscriptions/<id>/pay`
- Behavior:
  - Rejects if payment is not yet due (`next_payment` in the future).
  - If monthly -> adds 1 month to `next_payment`.
  - If yearly -> adds 1 year to `next_payment`.
- Implemented with `dateutil.relativedelta` for calendar-safe increments.

Frontend:
- Reminders page shows a checkbox action for items due **today**.
- On success, list refreshes with updated due date.

## 4.4 Reminder/status experience
- UI computes per-subscription status from `next_payment`:
  - Overdue
  - Due Today
  - Tomorrow
  - Within a week
  - Upcoming
- Backend also has reminders endpoint (`GET /api/reminders/upcoming?days=...`) for server-side horizon filtering, though current UI fetches `/subscriptions` and computes statuses client-side.

## 4.5 Analytics dashboard
- Summary endpoint (`GET /api/analytics/summary`) returns:
  - monthly_total
  - annual_total
  - active_subscriptions
- Category breakdown (`GET /api/analytics/category-breakdown`)
  - Aggregates category totals.
  - Uses SQL `CASE` to convert yearly costs into monthly equivalent in query-time calculations.

Frontend:
- KPI stat cards for totals/count.
- Pie chart for spend distribution.
- Category breakdown list with count + amount.

## 4.6 Export features
- `GET /api/export/csv`
  - Uses pandas DataFrame from serialized subscription data.
  - Sends downloadable CSV.
- `GET /api/export/pdf`
  - Uses ReportLab canvas.
  - Creates text-report style PDF with category/name/cost/cycle/date.

Frontend:
- Export dropdown in header.
- Downloads file blobs to local files (`subscriptions.csv` / `subscriptions.pdf`).

## 4.7 Optional outbound webhook notification
- `POST /api/reminders/notify`
- Sends minimal JSON payload to configured webhook URL (`NOTIFY_WEBHOOK_URL`).
- Returns status code from downstream webhook, or error if not configured/fails.

---

## 5) How features are implemented (methods/approach)

## Authentication method
- Stateless JWT auth on backend.
- Frontend token storage in browser localStorage.
- Axios request interceptor auto-injects auth header.
- Route guard pattern on frontend via context + conditional routing.

## Multi-tenant user data isolation method
- Every protected route resolves `user_id` from JWT identity.
- Queries always filter by `user_id`, ensuring each user sees only own records.

## Cost normalization method
- Domain methods (`monthly_cost`, `annual_cost`) provide normalized comparisons.
- SQL-level `CASE` expression used for accurate grouped analytics in DB query.

## Payment schedule advancement method
- Uses `relativedelta` rather than fixed day counts to avoid calendar drift.

## Export method
- Serialize DB records into a stable dict format (`serialize_sub`), then:
  - convert to CSV via pandas
  - render report lines to PDF via ReportLab

## UX method
- Simple, focused pages: Dashboard, Subscriptions, Reminders.
- Modal form for quick create/edit workflow.
- Status tags + today-only paid action reduce accidental date updates.

---

## 6) API surface (implemented endpoints)

## Auth (`/api/auth`)
- `POST /register`
- `POST /login`
- `POST /refresh` (refresh token required)
- `GET /me`

## Subscriptions + core (`/api`)
- `GET /subscriptions`
- `POST /subscriptions`
- `PUT /subscriptions/<id>`
- `DELETE /subscriptions/<id>`
- `POST /subscriptions/<id>/pay`

## Analytics (`/api`)
- `GET /analytics/summary`
- `GET /analytics/category-breakdown`

## Reminders (`/api`)
- `GET /reminders/upcoming`
- `POST /reminders/notify`

## Export (`/api`)
- `GET /export/csv`
- `GET /export/pdf`

---

## 7) Libraries and frameworks used

## Frontend libraries
- `react`, `react-dom`: UI rendering.
- `react-router-dom`: SPA routing/navigation.
- `axios`: HTTP client + auth interceptor support.
- `chart.js`, `react-chartjs-2`: charting for dashboard.
- `vite`: dev server + build tooling.
- `eslint` + plugins: code quality tooling.

## Backend libraries (inferred from imports)
- `flask`: API framework.
- `flask-sqlalchemy`: ORM integration.
- `flask-jwt-extended`: JWT auth.
- `flask-cors`: CORS control.
- `python-dotenv`: environment variable loading.
- `werkzeug`: password hashing/checking.
- `sqlalchemy`: query expressions and aggregation.
- `pandas`: CSV export pipeline.
- `reportlab`: PDF report generation.
- `python-dateutil`: recurring-date calculations (`relativedelta`).

Note: the repository currently does not include a Python dependency lock/requirements file, so backend package list is based on direct imports.

---

## 8) Configuration and environment

Backend config class (`backend/config.py`) supports:
- `SECRET_KEY`
- `DATABASE_URL` (required for runtime DB URI)
- `JWT_SECRET_KEY` (falls back to `SECRET_KEY`)
- `CORS_ORIGINS` (default `*`)
- `NOTIFY_WEBHOOK_URL` (optional)

Database setup options:
- `python backend/init_db.py` creates tables.
- Flask CLI command `flask init-db` is registered.

Runtime entrypoints:
- `backend/server.py` for local dev.
- `backend/wsgi.py` for WSGI hosting.

Frontend base API URL:
- hardcoded in `frontend-react/src/api/apiClient.js` as `http://localhost:5000/api`.

---

## 9) Current implementation notes

- Frontend has an App-level `App.css` containing mostly default Vite starter styles; main custom styles live in `src/index.css`.
- Currency symbol in UI is `₹` (Indian Rupee) for display.
- Some reminder logic is duplicated conceptually between backend and frontend, with frontend currently owning the status-tag presentation logic.

---

## 10) Project structure tree (current repository files)

```text
SubscriptionSavvy/
├── .gitignore
├── project_details.md
├── backend/
│   ├── config.py
│   ├── init_db.py
│   ├── server.py
│   ├── wsgi.py
│   └── app/
│       ├── __init__.py
│       ├── auth.py
│       ├── models.py
│       ├── routes.py
│       └── utils.py
└── frontend-react/
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    └── src/
        ├── App.css
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── api/
        │   └── apiClient.js
        ├── components/
        │   ├── AuthForm.jsx
        │   ├── Dashboard.jsx
        │   ├── Header.jsx
        │   ├── Reminders.jsx
        │   ├── SubscriptionModal.jsx
        │   └── Subscriptions.jsx
        ├── context/
        │   └── AuthContext.jsx
        └── pages/
            ├── AuthPage.jsx
            └── HomePage.jsx
```

---

## 11) Quick mental model for any new developer/LLM

If you need to quickly reason about the codebase:
1. Start at frontend `App.jsx` to understand route gating/auth flow.
2. Read `AuthContext.jsx` + `apiClient.js` to understand token lifecycle.
3. Read backend `app/__init__.py` for app composition and blueprints.
4. Read `models.py` for domain and recurring-cost behavior.
5. Read `routes.py` for feature endpoints and business rules.
6. Use `Dashboard.jsx`, `Subscriptions.jsx`, and `Reminders.jsx` to map API usage to UI behavior.

This path gives end-to-end understanding of login -> data CRUD -> analytics -> reminders -> exports.
