# Freelanceo — Features & User Flows

> Product + engineering reference. Each section describes a feature, the actors
> involved, a **drawn flow diagram**, the step-by-step behaviour, the notifications it
> raises, and the backend endpoints that power it.
>
> Diagrams are written in **Mermaid** — they render automatically in GitHub, GitLab,
> VS Code (Markdown preview), Notion, and Confluence. To share as Word/PDF, export this
> file from VS Code or paste into a Mermaid-aware doc tool.

**Stack:** React (frontend) · FastAPI (backend, `/api`) · MongoDB/Cosmos (data) · JWT +
session-cookie auth · Stripe (subscriptions). Payments for project milestones are
currently **tracked only** (no money movement yet — Stripe escrow is a future phase).

---

## 1. Feature Inventory

| # | Feature | Primary actor | Status |
|---|---------|---------------|--------|
| 1 | Sign up / registration (client or freelancer) | Guest | Live |
| 2 | Login (email + Google OAuth) | Guest | Live |
| 3 | Freelancer onboarding (build profile) | Freelancer | Live |
| 4 | Client onboarding (company profile) | Client | Live |
| 5 | Browse talent (gated preview for guests) | Guest / Client | Live |
| 6 | Freelancer profile, portfolio & reviews | All | Live |
| 7 | Follow a freelancer | Logged-in user | Live |
| 8 | Post a job (multi-step wizard) | Client | Live |
| 9 | Browse jobs (gated preview for guests/unsubscribed) | Freelancer | Live |
| 10 | Apply to a job with a proposal | Freelancer | Live |
| 11 | Review applicants → shortlist / decline / hire | Client | Live |
| 12 | Direct hire request (from a profile) | Client | Live |
| 13 | Contract: terms & milestone negotiation | Client + Freelancer | Live |
| 14 | Milestone lifecycle (fund → submit → approve → release) | Client + Freelancer | Live |
| 15 | My Jobs (client) & My Applications (freelancer) tracking | Client / Freelancer | Live |
| 16 | Messaging between users | All | Live |
| 17 | Social feed (posts, likes) | All | Live |
| 18 | Notifications + bell | All | Live |
| 19 | Reviews & ratings | Client → Freelancer | Live |
| 20 | Subscription / membership (Stripe) | Freelancer | Live |
| 21 | Admin console (users, jobs, categories) | Admin | Live |

---

## 2. Roles

```mermaid
flowchart LR
    Guest -->|signs up as| Client
    Guest -->|signs up as| Freelancer
    Admin -.->|manages| Client
    Admin -.->|manages| Freelancer

    Client -->|posts jobs, hires| Engagement[(Contracts & Milestones)]
    Freelancer -->|applies, delivers| Engagement
```

- **Guest** — not logged in. Sees limited previews of talent and jobs.
- **Client** — posts jobs, reviews applicants, hires, funds & approves milestones.
- **Freelancer** — builds a profile, applies to jobs, delivers milestones.
- **Admin** — platform management.

---

## 3. Sign-up & Authentication

**Actors:** Guest → becomes Client or Freelancer.

### 3.1 Sign-up flow

```mermaid
flowchart TD
    A[Guest opens /register] --> B{Choose role}
    B -->|Client| C[Enter name, email, password]
    B -->|Freelancer| D[Enter name, email, password]
    C --> E[POST /api/auth/register]
    D --> E
    E --> F{Email already used?}
    F -->|Yes| G[Show error: email taken]
    F -->|No| H[Create user + issue JWT + session cookie]
    H --> I{Role?}
    I -->|Client| J[Redirect to /client-onboarding]
    I -->|Freelancer| K[Redirect to /onboarding]
    J --> L[Company profile]
    K --> M[Freelancer profile builder]
```

**Google OAuth:** alternative sign-in that creates/links a user via
`POST /api/auth/google-session`, then follows the same onboarding branch.

**Steps**
1. Guest picks **Client** or **Freelancer** on `/register`.
2. Submits name, email, password.
3. Backend rejects duplicate emails; otherwise creates the user, hashes the password,
   returns the user and sets a 7-day session cookie + JWT.
4. New clients go to company onboarding; new freelancers go to the profile builder.

**Endpoints:** `POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/google-session`, `GET /api/auth/me`, `POST /api/auth/logout`.

---

## 4. Onboarding

### 4.1 Freelancer onboarding

```mermaid
flowchart LR
    A[/onboarding/] --> B[Title, category, bio]
    B --> C[Skills & languages]
    C --> D[Hourly rate & availability]
    D --> E[Portfolio items]
    E --> F[POST/PUT /api/freelancers/profile]
    F --> G[Profile is live in the marketplace]
```

### 4.2 Client onboarding

```mermaid
flowchart LR
    A[/client-onboarding/] --> B[Company name, industry, size]
    B --> C[Location & about]
    C --> D[POST /api/clients/profile]
    D --> E[Ready to post jobs & hire]
```

**Endpoints:** `GET/POST/PUT /api/freelancers/profile`,
`GET/POST/PUT /api/clients/profile`, `PUT /api/auth/me`.

---

## 5. Discover Talent (Browse Freelancers)

**Actors:** Guest (gated), Client, Admin.

```mermaid
flowchart TD
    A[/freelancers list] --> B{Logged in?}
    B -->|No guest| C[Preview only: title + rating, rest blurred + Sign-up CTA]
    B -->|Yes| D[Full cards: name, rate, skills, bio]
    D --> E[Filter by category, country, search by name/skill]
    D --> F[Open /freelancers/:id profile]
    F --> G[Portfolio, reviews, follow, message, hire]
```

- **Gating:** the backend **redacts** freelancer data for guests (`preview_only`), so it's a
  real gate, not just visual blur.
- **Search & filters:** category, country, and free-text (matches name/title/skills).

**Endpoints:** `GET /api/freelancers` (filters + guest redaction),
`GET /api/freelancers/featured`, `GET /api/freelancers/{id}`,
`GET /api/freelancers/countries`, `GET /api/freelancers/categories`.

---

## 6. Follow a Freelancer

```mermaid
sequenceDiagram
    actor U as User
    participant API
    participant DB
    U->>API: POST /api/freelancers/{id}/follow
    API->>DB: insert follow
    API->>DB: insert notification (type=follow) for freelancer
    API-->>U: 200 Following
    Note over API: Freelancer sees "X started following you" in their bell
```

**Endpoints:** `POST/DELETE /api/freelancers/{id}/follow`,
`GET /api/freelancers/{id}/is-following`, `GET /api/following`.

---

## 7. Post a Job

**Actor:** Client. Multi-step wizard.

```mermaid
flowchart TD
    A[Client → Post a job] --> B[Step 1: Title & category]
    B --> C[Step 2: Description & skills]
    C --> D[Step 3: Budget & type fixed/hourly]
    D --> E[Step 4: Duration, size, experience, remote]
    E --> F[Step 5: Review]
    F --> G[POST /api/jobs]
    G --> H[Job is Open on the board]
    H --> I[Appears in client's My Jobs]
```

**Endpoints:** `POST /api/jobs`, `GET /api/jobs/my-jobs`, `PUT /api/jobs/{id}`,
`DELETE /api/jobs/{id}`.

---

## 8. Browse Jobs (Job Board)

**Actors:** Freelancer (full when subscribed), Guest/unsubscribed (gated).

```mermaid
flowchart TD
    A[/jobs board] --> B{Viewer}
    B -->|Guest| C[Titles only, rest blurred + Sign-up CTA]
    B -->|Freelancer no sub| D[Titles only + Subscribe CTA]
    B -->|Freelancer subscribed| E[Full job cards]
    E --> F[Open /jobs/:id]
    F --> G[Full description, budget, client, Apply]
```

**Endpoints:** `GET /api/jobs` (guest/sub gating), `GET /api/jobs/featured`,
`GET /api/jobs/{id}` (owner client also gets full access to review applicants).

---

## 9. Apply to a Job (Proposal)

**Actor:** Freelancer.

```mermaid
sequenceDiagram
    actor F as Freelancer
    participant API
    participant DB
    actor C as Client
    F->>API: POST /api/jobs/{id}/apply {cover_letter, proposed_rate, rate_type, duration}
    API->>DB: create application (status=pending)
    API->>DB: increment job.applications_count
    API->>DB: notification (job_application) for client
    API-->>F: Application submitted
    Note over C: Client's bell shows "F applied to <job>"
    F->>API: GET /api/jobs/applications/my
    API-->>F: My Applications with progress (Applied→Shortlisted→Hired)
```

**Endpoints:** `POST /api/jobs/{id}/apply`, `GET /api/jobs/applications/my`,
`PUT /api/applications/{id}` (freelancer can `withdraw`).

---

## 10. Review Applicants → Hire

**Actor:** Client (job owner).

```mermaid
flowchart TD
    A[Client opens own job /jobs/:id] --> B[Sees applicant list + proposals]
    B --> C{Action per applicant}
    C -->|Shortlist| D[PUT /api/applications/id status=shortlisted]
    C -->|Decline| E[PUT /api/applications/id status=declined]
    C -->|Message| F[/dashboard/messages]
    C -->|Hire| G[POST /api/jobs/jid/applications/aid/hire]
    D --> H[Freelancer notified: shortlisted]
    E --> I[Freelancer notified: declined]
    G --> J[Create ACTIVE contract linked to job]
    J --> K[Freelancer notified: You've been hired]
    J --> L[Redirect client to contract to set terms]
```

**Endpoints:** `GET /api/jobs/{id}/applications`, `PUT /api/applications/{id}`,
`POST /api/jobs/{jid}/applications/{aid}/hire`.

---

## 11. Direct Hire Request (from a profile)

**Actor:** Client initiates without a job posting.

```mermaid
sequenceDiagram
    actor C as Client
    participant API
    actor F as Freelancer
    C->>API: POST /api/hiring-requests {freelancer_id, project_title, description, budget}
    API-->>F: notification (hiring_request)
    F->>API: PUT /api/hiring-requests/{id} status=accepted | rejected
    alt Accepted
        API->>API: create ACTIVE contract
        API-->>C: notification (contract started)
    else Rejected
        API-->>C: request marked rejected
    end
```

**Endpoints:** `GET /api/hiring-requests`, `POST /api/hiring-requests`,
`PUT /api/hiring-requests/{id}`.

---

## 12. Contract — Terms & Milestone Negotiation

Both the **hire** path (§10) and the **hire request** path (§11) create a **contract** in
`agreement_status = negotiating`. Either party then proposes terms; the other accepts.

```mermaid
flowchart TD
    A[Contract created: negotiating] --> B[Either party: Propose terms]
    B --> C[POST /api/contracts/id/terms<br/>payment_type, timeline, milestones amounts+due dates]
    C --> D[Other party notified: New terms proposed]
    D --> E{Respond}
    E -->|Accept| F[POST /terms/accept → agreement_status=agreed, milestones seeded]
    E -->|Decline| G[POST /terms/decline → back to negotiating]
    E -->|Counter| B
    F --> H[Work can begin on milestones]
```

**Endpoints:** `POST /api/contracts/{id}/terms`, `POST /api/contracts/{id}/terms/accept`,
`POST /api/contracts/{id}/terms/decline`, `GET /api/contracts`,
`GET /api/contracts/{id}`.

---

## 13. Milestone Lifecycle

Once terms are **agreed**, each milestone runs through this lifecycle. Payments are
**tracked only** (no funds move yet).

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> funded: Client funds
    funded --> in_progress: Freelancer starts
    pending --> in_progress: Freelancer starts
    in_progress --> submitted: Freelancer submits work
    funded --> submitted: Freelancer submits work
    submitted --> approved: Client approves
    submitted --> in_progress: Client requests changes
    approved --> released: Client releases payment
    released --> [*]
```

```mermaid
sequenceDiagram
    actor C as Client
    actor F as Freelancer
    participant API
    C->>API: fund (pending→funded)
    F->>API: start (→in_progress)
    F->>API: submit (→submitted)
    C->>API: approve (→approved)  or  request_changes (→in_progress)
    C->>API: release (→released)
    Note over API: Each action notifies the other party
    Note over API: When ALL milestones released → contract auto-completes
```

**Rules (role-gated):** fund/approve/release/request_changes = **client**;
start/submit = **freelancer**. Invalid transitions are rejected.

**Endpoint:** `POST /api/contracts/{id}/milestones/{mid}/action` with
`action ∈ {fund, start, submit, approve, release, request_changes}`.
Plus a **work diary**: `POST/DELETE /api/contracts/{id}/diary`.

---

## 14. Tracking Dashboards

```mermaid
flowchart LR
    subgraph Freelancer
      A[My Applications] --> A1[Status progress: Applied→Shortlisted→Hired]
      A1 --> A2[View job / View contract / Withdraw]
    end
    subgraph Client
      B[My Jobs] --> B1[Applicant / shortlisted / hired counts]
      B1 --> B2[View applicants / View contracts]
    end
```

**Endpoints:** `GET /api/jobs/applications/my` (freelancer),
`GET /api/jobs/my-jobs` (client, enriched with counts).

---

## 15. Messaging

```mermaid
sequenceDiagram
    actor A as User A
    participant API
    actor B as User B
    A->>API: POST /api/messages {receiver_id, content}
    API->>API: store message + notification (new_message) for B
    API-->>A: message echoed
    B->>API: GET /api/messages (conversation list w/ unread counts)
    B->>API: GET /api/messages/{A} (thread, marks read)
```

**Endpoints:** `GET /api/messages`, `GET /api/messages/{other_user_id}`,
`POST /api/messages`.

---

## 16. Social Feed

```mermaid
flowchart TD
    A[/feed] --> B[Create post: POST /api/posts]
    B --> C[Followers notified: new_post]
    A --> D[Like a post: POST /api/posts/id/like]
    D --> E[Author notified: like]
    A --> F[Follow users → personalised feed]
```

**Endpoints:** `POST/GET/DELETE /api/posts`, `GET /api/feed`,
`POST /api/posts/{id}/like`, `GET /api/posts/{id}/is-liked`.

---

## 17. Notifications

A single notification stream powers the **bell** (unread badge + dropdown) and the
`/notifications` page.

```mermaid
flowchart LR
    subgraph Triggers
      T1[Job application]
      T2[Shortlist / Decline]
      T3[Hire / Contract started]
      T4[New message]
      T5[Hiring request]
      T6[Terms proposed / accepted]
      T7[Milestone update]
      T8[New follower]
      T9[Post like]
      T10[New review]
    end
    Triggers --> N[(notifications)]
    N --> Bell[🔔 Bell: unread badge + dropdown]
    Bell -->|click item| Read[Mark read + navigate to link]
    Bell --> All[View all → /notifications]
```

**Endpoints:** `GET /api/notifications`, `GET /api/notifications/unread-count`,
`PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all`.
The bell polls the unread count every ~45s.

---

## 18. Reviews & Ratings

```mermaid
sequenceDiagram
    actor C as Client
    participant API
    actor F as Freelancer
    C->>API: POST /api/freelancers/{id}/reviews {rating, comment}
    API->>API: store review + recompute average_rating & total_reviews
    API->>API: notification (review) for freelancer
    API-->>C: review created
    Note over F: Rating shows on profile and in gated previews
```

**Endpoints:** `POST /api/freelancers/{id}/reviews`, reviews returned with the profile.

---

## 19. Subscription / Membership (Stripe)

**Actor:** Freelancer (unlocks full job details + applying).

```mermaid
flowchart TD
    A[Freelancer → /pricing] --> B{Plan}
    B -->|Monthly| C[Stripe checkout]
    B -->|Yearly| C
    C --> D[POST /api/payments/checkout]
    D --> E[Stripe hosted payment]
    E --> F[Webhook confirms → subscription_status=active]
    F --> G[Full job board access + apply]
```

**Endpoints:** `POST /api/payments/checkout`, `GET /api/payments/status`,
Stripe webhook. **Note:** milestone/project payments are separate and currently
tracked-only.

---

## 20. Admin Console

```mermaid
flowchart LR
    A[/admin] --> B[Users: list, role, ban, delete]
    A --> C[Freelancers: feature, subscription]
    A --> D[Jobs: list, delete]
    A --> E[Categories: CRUD]
    A --> F[Stats & payments overview]
```

**Endpoints:** `GET /api/admin/stats`, `GET /api/admin/users`,
`PATCH /api/admin/users/{id}/role|status`, `DELETE /api/admin/users/{id}`,
`GET/DELETE /api/admin/freelancers`, `GET/DELETE /api/admin/jobs`,
`GET/POST/DELETE /api/admin/categories`, `GET /api/admin/payments`.

---

## 21. End-to-End Happy Path (job → delivery)

```mermaid
flowchart TD
    S1[Client posts job] --> S2[Freelancer applies with proposal]
    S2 --> S3[Client reviews applicants]
    S3 --> S4[Client hires → contract created]
    S4 --> S5[Parties agree terms & milestones]
    S5 --> S6[Fund → work → submit → approve → release per milestone]
    S6 --> S7[All milestones released → contract completed]
    S7 --> S8[Client leaves a review]
    S8 --> S9[Rating boosts freelancer profile]
```

Every arrow above raises a **notification** to the counterparty, surfaced through the bell.

---

### Legend / conventions
- **Notifications** are created server-side at each state change and appear in the bell.
- **Gating** = server-side redaction (`preview_only` / `requires_subscription`) for guests
  and unsubscribed freelancers — enforced in the API, not just the UI.
- **Tracked-only payments** = milestone fund/release change status only; no real money
  moves yet (planned Stripe escrow phase).
