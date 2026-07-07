# Changelog

All notable changes to Freelanceo are tracked here. Newest first.

Format: each entry has a date, a short summary, the areas touched, and the key files.

---

## 2026-07-07 — Message opens the right chat + applicant filters

**Summary:** Clicking "Message" on an applicant now opens a conversation with that person
directly (instead of the empty Messages page), and the applicant list can be filtered by
status.

**Fixed / Added — frontend**
- `pages/Messages.jsx` — supports a deep link `/dashboard/messages?userId=..&name=..&picture=..`;
  on load it opens (or starts) the chat with that user, then clears the query params.
- `pages/JobDetail.jsx` — the applicant **Message** button now deep-links to that
  freelancer's chat. Added **status filters** (All / Applied / Shortlisted / Hired /
  Declined) with per-status counts above the applicant list.

**Note (engineering):** avoid nested parenthesised ternaries in JSX — CRA's Flow parser
rejects them (`Unexpected token, expected ","`); use `&&` conditionals. Also don't add an
`eslint-disable` for a rule the config doesn't load (`react-hooks/exhaustive-deps`) — it
errors the build.

**Tested (local)** Frontend compiles clean; deep-link builds the conversation from the
applicant's user id; filters slice the list by status.

---

## 2026-07-07 — Notification bell + more notification triggers

**Summary:** Added a notification **bell** in the navbar (desktop + mobile) with a live
unread badge, a dropdown of recent notifications, click-to-open (marks read + navigates),
and "Mark all read". Added notifications for **new follower** and **post like**, and fixed
two endpoints that returned HTTP 500 (same Mongo `_id` bug as messaging).

**Added — frontend**
- `components/NotificationBell.jsx` — bell + red unread badge, polls unread count every
  45s, dropdown lists recent notifications, per-item mark-read + navigate, mark-all-read,
  "View all" → `/notifications`.
- `components/Navbar.jsx` — renders the bell for logged-in users (desktop and mobile).

**Fixed / Added — `backend/server.py`**
- `POST /freelancers/{id}/follow` now notifies the freelancer (new follower).
- `POST /posts/{id}/like` now notifies the post author.
- Fixed 500s: `POST /freelancers/{id}/reviews` and `POST /hiring-requests` used
  `return {"_id": 0, **doc}` where `insert_one` had injected an `ObjectId` — now pop `_id`.
  (Reviews also now notify the freelancer.)
- Existing notification triggers confirmed: job application, application shortlist/decline,
  hire, new message, hiring request, contract created, contract terms, milestone updates.

**Tested (local, mock DB)** apply → client +1; follow → freelancer +1; hiring request
(no 500) → freelancer +1; unread-count and mark-all-read work; dropdown lists types.

---

## 2026-07-07 — My Applications (freelancer) & My Jobs (client) pages + progress

**Summary:** Dedicated tracking pages. Freelancers get a **My Applications** page with a
progress tracker (Applied → Shortlisted → Hired) per application; clients get a **My Jobs**
page listing their posts with live applicant/shortlisted/hired counts. Both link through to
the job (applicant list) or the resulting contract. Also fixed job access so a client can
open their **own** job to review applicants.

**Fixed / Changed — `backend/server.py`**
- `GET /api/jobs/{id}` rewritten: the **owner client** now gets full job details (needed to
  see applicants) instead of a 403/preview; guests & unsubscribed freelancers still get a
  preview; other clients get a preview.
- `GET /api/jobs/my-jobs` now returns `applicant_count`, `shortlisted_count`, `hired_count`
  per job (computed live from applications).
- Shortlist/decline notification now links to `/dashboard/applications`.

**Added — frontend**
- `pages/MyApplications.jsx` (route `/dashboard/applications`, freelancer-only) — status
  progress bar, proposal summary, View job / View contract / Withdraw.
- `pages/MyJobs.jsx` (route `/dashboard/jobs`, client-only) — job list with applicant
  progress chips + View applicants / View contracts.
- `App.js` routes + `Navbar.jsx` links ("My Applications" for freelancers, "My Jobs" for
  clients).

**Tested (local, mock DB)** Owner job view returns full details; my-jobs counts update
after apply/hire; my-applications shows status + `contract_id` after hire.

---

## 2026-07-07 — Hiring flow: application proposals, hire, contract terms & milestones

**Summary:** End-to-end Upwork/Ureed-style hiring flow. Freelancers apply with a
proposal; clients review applicants and can hire/shortlist/decline; hiring creates a
contract where both parties negotiate terms and milestones, then run each milestone
through a fund → start → submit → approve → release lifecycle. Payments are **tracked
only** (no real money yet — Stripe integration comes later).

**Added / Changed — `backend/server.py`**
- `POST /api/jobs/{id}/apply` now accepts a proposal body: `cover_letter`,
  `proposed_rate`, `proposed_rate_type` (fixed/hourly), `estimated_duration`.
- `PUT /api/applications/{id}` — client shortlist/decline; freelancer withdraw (+notify).
- `POST /api/jobs/{jid}/applications/{aid}/hire` — client hires an applicant → creates an
  active contract (linked to the job) and notifies the freelancer.
- Contracts gained negotiation fields: `payment_type`, `total_amount`, `timeline`,
  `agreement_status`, `client_agreed`, `freelancer_agreed`, `proposed_terms`, `milestones`.
- `POST /api/contracts/{id}/terms` (propose/counter), `/terms/accept`, `/terms/decline`.
- `POST /api/contracts/{id}/milestones/{mid}/action` — `fund|start|submit|approve|`
  `release|request_changes`, role-gated with valid-transition checks; contract
  auto-completes when every milestone is released. Notifications at each step.

**Added / Changed — frontend**
- `pages/JobDetail.jsx` — apply is now a proposal dialog (cover letter, rate, duration);
  applicant cards show the proposal and give Hire / Shortlist / Decline / View Contract.
- `pages/ContractDetail.jsx` — new Terms & Milestones panel: propose/counter terms with
  milestone rows, accept/decline, and per-milestone action buttons by role/status.
- `pages/HiringRequests.jsx` — "View contract" link on accepted/completed requests.

**Tested (local, mock DB)** Full flow verified: apply-with-proposal → client notified →
applicant view → shortlist → hire → contract → propose terms+3 milestones → freelancer
accepts → fund/start/submit/approve/release → auto-complete. Permission checks pass
(freelancer can't fund; can't approve a pending milestone).

---

## 2026-07-06 — Guest-gated browse preview + messaging 500 fix

**Summary:** Logged-out visitors browsing the marketplace now see a limited preview
(freelancer title + review score, or job title only) with everything else greyed out
behind a sign-up CTA. Also fixed a bug that made sending a message return HTTP 500.

**Fixed**
- `backend/server.py` — `POST /api/messages` returned 500 (`ObjectId not iterable`).
  `insert_one` mutates the dict with a Mongo `_id`, and the old
  `return {"_id": 0, **message}` let that ObjectId override the 0, which FastAPI could
  not serialize. Now pops `_id` and returns the clean message.

**Added**
- `frontend/src/pages/JobsList.jsx` — preview banner now also shown to guests
  ("Sign up to unlock full job details" → /register), not just non-subscribed freelancers.
- (Earlier this session) guest redaction on `GET /api/freelancers` and `/api/jobs`,
  locked teaser cards in `FreelancerCard.jsx` / `JobCard.jsx`, guest banner on
  `FreelancersList.jsx`.

**Tested (local, mock DB)** Full two-user messaging flow verified end-to-end: send,
receive, reply, conversation lists, unread counts, read-status, and `new_message`
notifications for both parties. Guest browse shows title + rating only.

---

## 2026-07-06 — Freelancer search by name + country filter

**Summary:** Searching the talent marketplace by a freelancer's name now works, and a
Country filter was added alongside Category.

**Fixed / Added**
- `backend/server.py`
  - `GET /api/freelancers` search now also matches the freelancer's **name** (looked up
    on the users collection and OR'd into the query) — previously only title/bio/skills.
  - New `country` filter param on `GET /api/freelancers`.
  - New `GET /api/freelancers/countries` — distinct countries of active freelancers.
- `frontend/src/pages/FreelancersList.jsx` — added a **Country** dropdown filter (fed by
  the new endpoint) next to Category; wired into the query + URL params.

**Tested (local)** search "Sarah" → Sarah Johnson; "garcia" → Maria Garcia; country
= Lebanon → Omar Haddad.

---

## 2026-07-06 — Client hiring hub + role-based search

**Summary:** Reworked the client's landing (dashboard) into a hire-focused hub and
enforced role-based navigation — clients search freelancers, freelancers search jobs.

**Changed**
- `frontend/src/pages/Dashboard.jsx` — client view now has a hero ("Hire proven
  freelancers who deliver results" + Post a job / Browse freelancers), a "safe & secure
  hiring" strip, a category list linking to the talent marketplace, and quick links
  (Messages, Requests, Contracts, Company Settings).
- `frontend/src/components/Navbar.jsx` — "Find Talent" is hidden for freelancers and
  "Find Work/Find Jobs" for clients (desktop + mobile); "Post a Job" now links to
  `/jobs/post` and shows for clients.

---

## 2026-07-06 — Client experience: sign-up flow, business onboarding, job wizard, company settings

**Summary:** Built out the client (hiring) side to mirror an Upwork-style flow — a
role-aware sign-up, a business-context onboarding step, a 5-step guided job-post
wizard, and a company settings/profile page.

**Added**
- `backend/server.py`
  - `client_profiles` collection + `ClientProfileCreate/Update` models.
  - `GET /api/clients/profile/me`, `POST/PUT /api/clients/profile` (idempotent upsert).
  - Job scope fields on `JobPostCreate/Update` + job doc: `project_size`,
    `experience_level`, `contract_to_hire`.
- `frontend/src/pages/ClientOnboarding.jsx` — "Welcome to Freelanceo!" business context
  (company name, website, org size, industry, country) → saves company profile.
- `frontend/src/pages/ClientSettings.jsx` — client company settings (account name,
  company details, contact & country-aware address). Route `/dashboard/company`.

**Changed**
- `frontend/src/pages/Register.jsx` — role-aware sign-up ("Sign up to hire talent" vs
  "find work"), First/Last name, work email, 8+ char password, country dropdown,
  marketing + Terms checkboxes; clients route to `/client-onboarding`.
- `frontend/src/pages/PostJob.jsx` — rebuilt as a 5-step wizard: Title → Skills (+
  category) → Scope (size, duration, experience, contract-to-hire) → Budget
  (hourly/fixed, from/to) → Description, with a review step and progress bar.
- `frontend/src/App.js` — routes for `/client-onboarding` and `/dashboard/company`.
- `frontend/src/components/Navbar.jsx` — "Company Settings" link for clients.

**Tested (local mock DB)** register→client, save/get company profile, and job post with
scope fields all return 200. Frontend build passes.

**Not deployed** — committed locally for local testing per the cost-saving workflow.

---

## 2026-07-06 — Local dev loop (mock DB + auto-seed), no Azure needed

**Summary:** You can now run and fully test the app locally without touching Azure
Cosmos (which is private-endpoint only). Backend runs against an in-memory mock DB that
auto-seeds demo data + a local admin on startup, so you only push to Azure when a
change actually needs Azure-only pieces.

**Added**
- `backend/requirements-dev.txt` — lean local deps incl. `mongomock-motor` (heavy
  cloud/ML deps excluded; they're lazily imported and Azure-only).
- `backend/server.py` — startup hook `_local_auto_seed()`: when `USE_MOCK_DB=true`
  (or `AUTO_SEED=1`) and the DB is empty, seeds demo data via the extracted
  `_seed_demo_data()` helper and creates a local admin (`freelanceo@freelanceo.com` /
  `rorotest`). No-op on Azure (neither flag is set there).
- `frontend/.env.development` (gitignored) — points `yarn start` at `localhost:8001`.

**How to run locally**
```
cd backend; pip install -r requirements-dev.txt; python -m uvicorn server:app --port 8001
cd frontend; yarn start
```
`backend/.env` already has `USE_MOCK_DB="true"`. Log in with the demo accounts
(`*.@freelanceo-demo.com` / `Demo1234!`) or the admin above.

**Caveat** the mock DB does not replicate Cosmos quirks (e.g. the `.sort()` limitation)
and Azure-only features (Foundry CV parsing, Blob uploads) won't work locally.

---

## 2026-07-06 — Admin: separate Admins / Clients / Freelancers tabs

**Summary:** Restructured the Admin dashboard so identities are grouped the way they'll
map to production identity providers: an **Admins** tab (platform managers → Entra ID),
a **Clients** tab and a **Freelancers** tab (both → Entra External ID). The Freelancers
tab now shows the actual user (name + email) instead of only the profile title.

**Changed** (`frontend/src/pages/Admin.jsx`)
- Tabs are now: **Admins, Clients, Freelancers, Jobs, Categories, Payments** (default
  Admins).
- `UsersTab` is role-aware (`role` + `title` + `subtitle` props) and passes `role` to
  `/admin/users`; used for both Admins (`role=admin`) and Clients (`role=client`), each
  with a note about the future Entra provider.
- Freelancers tab: columns are now **Name, Email, Category, Subscription, Rating,
  Actions** (title shown as sub-text under the name; Featured/Suspended shown as small
  badges). Keeps the ⚡ subscription, ⭐ feature, suspend and delete actions.

---

## 2026-07-06 — Fix admin page (and other lists) failing to load

**Summary:** The Admin page showed "failed to load users" and no data, because the
admin list endpoints (and several others) used server-side Cosmos `.sort()`, which
500s on this account once a collection has data. Converted every `.find().sort()` to
sort in Python.

**Fixed** (`backend/server.py`) — sort in Python instead of Cosmos `.sort()` for:
`/admin/users`, `/admin/freelancers`, `/admin/jobs`, `/admin/payments`, plus
`/messages/{id}`, `/hiring-requests`, `/contracts`, `/posts`, `/feed`,
`/notifications`, and `/jobs/applications/my`. Pagination is now done in Python too.

**Verified (live)** all four admin list endpoints return 200; the admin dashboard
loads 37 users.

---

## 2026-07-06 — Fuller Edit Profile, admin subscription control, admin account

**Summary:** Edit Profile now exposes personal details (name, phone, DOB, country and
country-aware address) plus specialties; admins can grant/revoke a freelancer's
subscription from the Admin page; and added a gated helper to set up an admin account.

**Added**
- `backend/server.py`
  - `PUT /api/auth/me` — update the signed-in user's display name / picture.
  - `PATCH /api/admin/freelancers/{id}/subscription` — admin grants/revokes a
    subscription (`active: true/false`); activating sets a 1-year expiry and makes the
    freelancer visible in the marketplace.
  - `POST /api/admin/dev-setup` (gated by `SEED_SECRET`, 404 when unset) —
    create/promote a user to a role and optionally reset their password (test only).
- `frontend/src/pages/EditProfile.jsx` — new **Personal Details** section (Full Name,
  Phone, Date of birth, Country dropdown, Street address, City, country-aware
  State/Province, country-aware postal code with validation) and a **Specialties**
  editor. Name is saved via `PUT /api/auth/me`; profile fields via the profile PUT.
- `frontend/src/pages/Admin.jsx` — subscription toggle (⚡) on each freelancer row.

**Verified (live)** admin `freelanceo@freelanceo.com` created with role admin, logs in
and reaches `/api/admin/*`.

---

## 2026-07-06 — Fix job detail blank screen + missing reviews

**Summary:** Clicking a job showed a blank screen (and the browser Back button then
appeared stuck), and freelancers displayed review counts with no reviews listed. Both
fixed.

**Fixed**
- `frontend/src/pages/JobDetail.jsx` — the preview-only branch rendered `<Lock />`
  icons but `Lock` was never imported from lucide-react. For any non-subscribed/anon
  viewer the job endpoint returns a `preview_only` payload → that branch rendered →
  undefined component → React crashed to a blank screen (which also broke Back, since
  the crashed tree never recovered). Added the missing `Lock` import.
- `backend/server.py` — `GET /api/freelancers/{id}/reviews` used server-side Cosmos
  `.sort()` (500 once reviews exist); now sorted in Python.

**Changed**
- `backend/server.py` `/api/admin/seed-demo` — now creates 3 real review documents per
  freelancer (from the 3 demo clients) and sets `average_rating`/`total_reviews` to
  match the seeded reviews, so counts and the reviews list are consistent. Re-running
  the seed corrects previously seeded profiles. (30 reviews total.)

**Verified (live)** job preview no longer blanks; a freelancer shows rating 5.0 with 3
matching reviews.

---

## 2026-07-06 — Demo data seeding + jobs listing fix

**Summary:** Added a secret-gated endpoint to populate the database with realistic
demo data (10 freelancers with full profiles + active subscriptions, 3 clients, 8 job
posts across categories) so the marketplace, homepage and jobs pages look populated.
Also fixed a pre-existing 500 on the jobs listings.

**Added**
- `backend/server.py` — `POST /api/admin/seed-demo` (gated by the `SEED_SECRET` env
  var; returns 404 when unset). Idempotent: upserts demo freelancer profiles
  (`subscription_status: active`, ratings/reviews, some featured), clients, and jobs.
  All demo accounts use password `Demo1234!`; demo emails end in `-demo.com`.

**Fixed**
- `backend/server.py` — jobs listings (`GET /api/jobs`, `/api/jobs/featured`,
  `/api/jobs/my-jobs`) returned 500 once jobs existed, because Cosmos (Mongo API)
  rejects server-side `.sort()` on non-indexed fields here. Now sorted in Python
  (same pattern already used for featured freelancers).

**Verified (live)**
- 10 freelancers visible in `/api/freelancers`; featured populated.
- 8 jobs visible to a subscribed freelancer via `/api/jobs`; homepage featured works.

**Notes**
- `SEED_SECRET` app setting is currently set (so the endpoint is callable). To lock it
  down, remove the `SEED_SECRET` app setting — the endpoint then returns 404.

---

## 2026-07-06 — CV autofill: parse resume to pre-fill the onboarding profile

**Summary:** Freelancers can now upload a CV (PDF or Word) on the first onboarding
step and have their profile auto-filled — title, bio, category, skills, specialties,
work experience, education, languages, years of experience, phone, country, city.
Parsing uses the existing Foundry `gpt-5.4` deployment via managed identity. Users
still review and edit every step before publishing; "Fill in manually" remains.

**Added**
- `backend/server.py` — `POST /api/freelancers/parse-cv`: validates file (PDF/DOCX,
  ≤10 MB), extracts text (`pypdf` / `python-docx`), calls Foundry with a strict JSON
  schema prompt (`AsyncAzureOpenAI` + managed-identity token), sanitizes/validates the
  model output, and returns structured profile fields. Graceful errors fall back to
  manual entry (scanned-image CVs are not supported yet).
- `backend/requirements.txt` — `pypdf`, `python-docx`.
- `frontend/src/pages/FreelancerOnboarding.jsx` — welcome step now offers "Upload CV to
  autofill" vs "Fill in manually"; parsed data is merged into the wizard (category is
  matched to the allowed list, country matched/aliased to the dropdown) and the user is
  dropped into step 1 to review.

**Infra (Azure, applied directly)**
- App setting `AZURE_OPENAI_ENDPOINT` = `https://freenlaceo-ai.cognitiveservices.azure.com/`,
  `AZURE_OPENAI_DEPLOYMENT` = `gpt-5.4`, `AZURE_OPENAI_API_VERSION` = `2024-12-01-preview`.
- App Service managed identity granted **Cognitive Services OpenAI User** on the
  `Freenlaceo-AI` Foundry account.

**Notes**
- No secrets in config — auth is managed identity end-to-end.
- Verified frontend build; backend endpoint verified post-deploy.

---

## 2026-07-06 — Onboarding: language/country dropdowns, country-aware address, photo upload

**Summary:** Enhanced the freelancer onboarding wizard with structured, guided inputs:
languages and countries are now dropdowns; the address fields adapt to the selected
country (field labels + postal-code format/validation change per country, and
countries without postal codes hide that field); and a new step lets the freelancer
upload a profile photo.

**Added**
- `frontend/src/lib/locationData.js` — `LANGUAGES`, `COUNTRIES`, US states/CA provinces,
  per-country address config (`getAddressConfig`) and postal-code validation
  (`getPostalError`).
- New "photo" onboarding step: image picker with live preview, client-side downscale
  to a compact JPEG data URL stored in `profile_photo` (no blob storage dependency),
  remove/change controls. Shown in the review step.

**Changed**
- `frontend/src/pages/FreelancerOnboarding.jsx`
  - Languages step: free-text input → dropdown (excludes already-picked languages).
  - Personal step: Country is a dropdown; City/State labels and the postal field
    (label, placeholder, validation) are driven by the chosen country; US/Canada/etc.
    show a state/province dropdown; postal code is validated and blocks "Next" if
    invalid. Changing country resets state + postal.
  - Submit payload now includes `profile_photo`.

**Notes**
- Backend already supported `profile_photo` and all address fields — no backend change.
- Verified production build compiles (`yarn build`, +3.18 kB gzip).

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
