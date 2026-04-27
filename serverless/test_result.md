#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data.
#
# Backend Test Format (YAML inside backend section)
# Frontend Test Format (YAML inside frontend section)
#
#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

user_problem_statement: |
  Build a complete Next.js full-stack app for "SubscriptionSavvy" - a personal subscription tracker.
  Pages: /auth, /dashboard, /subscriptions, /reminders. JWT auth with localStorage. INR currency.
  Dark mode, modern finance aesthetic, no purple gradients. Sidebar nav (mobile bottom-nav).

backend:
  - task: "JWT Auth - register/login/me"
    implemented: true
    working: "NA"
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented HMAC-SHA256 JWT (no jsonwebtoken dep) + scrypt password hashing. Endpoints: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me. Tokens stored & validated via Bearer header."

  - task: "Subscriptions CRUD"
    implemented: true
    working: "NA"
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/POST /api/subscriptions, PUT/DELETE /api/subscriptions/:id. UUID ids, scoped by user_id. POST /api/subscriptions/:id/pay advances next_payment by cycle and writes payment record."

  - task: "Analytics endpoints"
    implemented: true
    working: "NA"
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/analytics/summary returns monthly_total/annual_total/active_subscriptions. GET /api/analytics/category-breakdown returns array of {category,count,monthly_amount}. Yearly costs are normalized to monthly equivalents."

  - task: "CSV & PDF export"
    implemented: true
    working: "NA"
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/export/csv returns CSV file. GET /api/export/pdf returns minimal hand-built valid PDF. Both require auth."

frontend:
  - task: "Auth, Dashboard, Subscriptions, Reminders pages"
    implemented: true
    working: "NA"
    file: "app/auth/page.js, app/dashboard/page.js, app/subscriptions/page.js, app/reminders/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Built dark-mode (slate + emerald) UI with sidebar/bottom-nav, axios+JWT interceptor, AuthContext, ProtectedRoute, recharts pie chart, status badges, modal CRUD, mark-paid action, CSV/PDF export menu."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "JWT Auth - register/login/me"
    - "Subscriptions CRUD"
    - "Analytics endpoints"
    - "CSV & PDF export"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Initial backend implementation complete. Manual smoke test of /api/auth/register passed (token returned). Please run full backend test of all endpoints including auth flow, subscription CRUD, mark-as-paid (should advance next_payment), analytics calculations (yearly normalized to monthly), and exports. Use base URL via /api prefix on the same host."
