# Changelog

All notable changes to Freelanceo are tracked here. Newest first.

Format: each entry has a date, a short summary, the areas touched, and the key files.

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
