# Changelog

All notable changes to Freelanceo are tracked here. Newest first.

Format: each entry has a date, a short summary, the areas touched, and the key files.

---

## 2026-07-06 — Fix freelancer onboarding inputs losing focus after one character

**Summary:** In the freelancer onboarding wizard ("Create your profile"), typing in
any text field (Specialties, Skills, Title, Bio, personal details, etc.) dropped focus
after a single keystroke, forcing a re-click for every character. Root cause: the
`OptionCard` and `StepShell` presentational components were defined *inside* the
`FreelancerOnboarding` component, so every keystroke (state update → re-render)
created new component identities and React remounted the whole subtree, including the
active input. Fixed by hoisting both components to module scope (they are pure and
props-only), giving them stable identities across renders.

**Changed**
- `frontend/src/pages/FreelancerOnboarding.jsx` — moved `OptionCard` and `StepShell`
  out of the component body to module scope; added an explanatory comment.

**Notes**
- No behavior/markup change — purely structural. Verified no compile errors.
- Infra (not code): resolved sign-up 500s by fronting Cosmos DB with a Private
  Endpoint (VNet `freelanceo-vnet`, PE `freelanceo-db-pe`, private DNS zone
  `privatelink.mongo.cosmos.azure.com`, App Service VNet integration) because Azure
  Policy force-disables Cosmos public network access. Applied directly to Azure.

---

## 2026-07-04 — Remove Emergent auth dependency (email/password only)

**Summary:** Removed all dependency on Emergent Auth / Google OAuth from sign-up and
sign-in. Both freelancer and client accounts now register and log in with
email + password only, stored in Cosmos DB (bcrypt-hashed). This enables creating
test users directly for internal testing without any external auth provider.

**Changed**
- `frontend/src/pages/Login.jsx` — removed "Continue with Google" buttons and the
  `auth.emergentagent.com` redirect; email/password form only.
- `frontend/src/pages/Register.jsx` — removed Google sign-up buttons and Emergent
  redirect; email/password form only (role selector: freelancer/client retained).
- `frontend/src/App.js` — removed `loginWithGoogle`, the `OAuthCallback` handler and
  its routes, and the OAuth callback effect; cleaned up now-unused imports.
- `backend/server.py` — removed the `/api/auth/google-session` endpoint and the
  `GoogleSessionRequest` model (both called `demobackend.emergentagent.com`).

**Notes**
- `POST /api/auth/register` and `POST /api/auth/login` (email/password, JWT + session
  cookie) are the sole auth paths; users persist in the `users` collection in Cosmos.
- Stripe still uses `emergentintegrations` for payments — out of scope for this change.

---

## 2026-07-04 — Documentation refresh (v1.1)

**Summary:** Updated all project documents to match the current application and the
live Azure test environment. Added the Azure test-environment architecture, brought
the feature lists up to date (Contracts & Work Diary, Freelancer Statistics,
portfolio media uploads, Account Health, onboarding wizard, Membership & Billing,
Admin panel), and reaffirmed the subscription-only (0% commission) model.

**Docs updated**
- `MVP_DOCUMENTATION.md` — v1.1: new-features section, updated collections (14),
  endpoints, tech stack (React 19), and Azure deployment info.
- `TECHNICAL_DOCUMENTATION.md` — v1.1: Azure deployment architecture + CI/CD,
  new feature sections, `contracts` collection schema, v1.1 endpoint summary.
- `ARCHITECTURE_DIAGRAMS.md` — added the **Azure Test Environment Architecture**
  diagram and CI/CD pipeline; kept the original dev diagram for reference.
- `COMPETITIVE_ANALYSIS.md` — v1.1: Contracts/Work Diary, media portfolio and
  Account Health added to positioning and the feature-comparison matrix.
- `FINANCIAL_PROJECTIONS.md` / `FINANCIAL_PROJECTIONS_LEBANON.md` — v1.1 notes
  (model unchanged; features support retention; Azure hosting).
- `BUSINESS_PLAN.md` / `BUSINESS_PLAN_LEBANON.md` — v1.1 notes + enriched solution.
- `README.md`, `QUICK_REFERENCE.md`, `plan.md` — refreshed features, routes, URLs,
  and tech stack.

---

## 2026-07-04 — Contracts & Work Diary

**Summary:** Added a full Contracts feature so freelancers and clients can track
engagements. A contract is created automatically when a freelancer accepts a
hiring request. No earnings/withdraw UI — consistent with the subscription-only
model (Freelanceo charges a monthly membership fee, takes no service fee).

**Backend** (`backend/server.py`)
- New `contracts` collection (diary entries embedded as a list).
- Contract auto-creates when a hiring request is **accepted**; marked
  **completed** when the request is completed. Client is notified on start.
- New endpoints:
  - `GET /api/contracts` — list for current user (search, status filter, sort).
  - `GET /api/contracts/summary` — active / completed / ended / total counts.
  - `GET /api/contracts/{id}` — single contract with diary.
  - `PUT /api/contracts/{id}` — update status (active → completed / ended).
  - `POST /api/contracts/{id}/diary` — add a dated activity-log entry.
  - `DELETE /api/contracts/{id}/diary/{entry_id}` — remove own entry.
- Participant-only authorization on all contract routes.
- New models: `ContractUpdate`, `DiaryEntryCreate`.

**Frontend**
- `frontend/src/pages/Contracts.jsx` — "All contracts" page: summary strip
  (active/completed/total), search, status filter, sort by start date, contract
  cards, and empty state.
- `frontend/src/pages/ContractDetail.jsx` — contract header with
  "Mark complete / End" actions plus the Work Diary (add/list/delete dated notes).
- `frontend/src/App.js` — routes `/dashboard/contracts` and
  `/dashboard/contracts/:id`.
- `frontend/src/components/Navbar.jsx` — "Contracts" link in the user dropdown.
- `frontend/src/pages/Dashboard.jsx` — Contracts quick-action cards for both
  freelancer and client dashboards.

**Verified:** `yarn build` compiles successfully.

---

## Earlier (pre-changelog, same test cycle)

These shipped before this changelog was started, recorded here for continuity:

- **Freelancer Stats** page (`/dashboard/stats`) — profile views, followers,
  ratings, opportunities. No earnings shown.
- **Portfolio media uploads** — images/video/audio (up to 50 MB) via Azure Blob,
  rendered inline on the editor and public profile.
- **Account Health** page (`/dashboard/account-health`) — platform access,
  standing gauge, enforcement history (scaffold), Trust & Safety tips.
- **Membership & Billing** page + profile-completion widget.
- **Upwork-style multi-step freelancer onboarding** wizard.
- **Email sign-up** (in addition to Google) and removal of Emergent branding.
- **Admin panel** — product and category management.
- Initial **Azure test deployment** (App Service + Cosmos DB Mongo API + Static
  Web App) with GitHub Actions CI/CD.
