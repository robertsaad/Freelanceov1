# Freelanceo - Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                    │
│                                                                             │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐          │
│  │                │    │                │    │                │          │
│  │  Web Browser   │    │ Mobile Browser │    │  Native Apps   │          │
│  │  (Desktop)     │    │   (Phone)      │    │  iOS/Android   │          │
│  │                │    │                │    │  (Capacitor)   │          │
│  └────────────────┘    └────────────────┘    └────────────────┘          │
│         │                      │                      │                    │
│         └──────────────────────┴──────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES INGRESS                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      Ingress Controller                             │  │
│  │                                                                     │  │
│  │  Route: /api/*    ───────────►  Backend Service (Port 8001)       │  │
│  │  Route: /*        ───────────►  Frontend Service (Port 3000)      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│     BACKEND SERVICE          │    │     FRONTEND SERVICE         │
│                              │    │                              │
│  ┌────────────────────────┐ │    │  ┌────────────────────────┐ │
│  │   FastAPI App          │ │    │  │   React SPA            │ │
│  │   Python 3.11+         │ │    │  │   React 18             │ │
│  │                        │ │    │  │   TailwindCSS          │ │
│  │  - Authentication      │ │    │  │   Shadcn UI            │ │
│  │  - User Management     │ │    │  │                        │ │
│  │  - Jobs API            │ │    │  │  - Components          │ │
│  │  - Social Features     │ │    │  │  - Pages               │ │
│  │  - Payments            │ │    │  │  - Routing             │ │
│  │  - Messages            │ │    │  │  - State Management    │ │
│  └────────────────────────┘ │    │  └────────────────────────┘ │
│                              │    │                              │
│  Supervisor Process Mgmt     │    │  Hot Reload Enabled          │
└──────────────────────────────┘    └──────────────────────────────┘
                │                                   
                ▼                                   
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE TIER                             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    MongoDB 7.0                            │ │
│  │                                                           │ │
│  │  Collections:                                             │ │
│  │  • users                  • follows                       │ │
│  │  • freelancer_profiles    • posts                         │ │
│  │  • jobs                   • post_likes                    │ │
│  │  • job_applications       • messages                      │ │
│  │  • reviews                • notifications                 │ │
│  │  • sessions               • payment_transactions          │ │
│  │  • hiring_requests                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Stripe     │  │  Emergent    │  │   Posthog    │         │
│  │   Payments   │  │  Auth (OAuth)│  │   Analytics  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. User Registration Flow

```
┌─────────┐                                    ┌─────────┐
│  User   │                                    │ Backend │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. Fill registration form                  │
     │     (email, password, name, role)           │
     ├────────────────────────────────────────────►│
     │                                              │
     │                                         2. Validate input
     │                                         3. Hash password
     │                                         4. Create user record
     │                                         5. Generate session
     │                                              │
     │  6. Return user data + set cookie           │
     │◄────────────────────────────────────────────┤
     │                                              │
     │  7. Redirect to dashboard                   │
     │                                              │
```

### 2. Google OAuth Flow

```
┌─────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐
│  User   │  │ Frontend │  │  Emergent  │  │ Backend │
└────┬────┘  └────┬─────┘  └─────┬──────┘  └────┬────┘
     │            │                │              │
     │ 1. Click  │                │              │
     │  "Google" │                │              │
     ├───────────►│                │              │
     │            │                │              │
     │            │ 2. Redirect to │              │
     │            │  auth.emergentagent.com      │
     │            ├───────────────►│              │
     │            │                │              │
     │            │     3. Google Auth Flow       │
     │            │                │              │
     │            │ 4. Redirect    │              │
     │            │  with session  │              │
     │            │◄───────────────┤              │
     │            │                │              │
     │            │ 5. POST /auth/google-session │
     │            │                with session_id│
     │            ├──────────────────────────────►│
     │            │                │              │
     │            │                │    6. Verify session
     │            │                │    7. Get user data
     │            │                │    8. Create/update user
     │            │                │    9. Generate JWT
     │            │                │              │
     │            │ 10. User data  │              │
     │            │   + set cookie │              │
     │            │◄──────────────────────────────┤
     │            │                │              │
     │ 11. Show  │                │              │
     │  Dashboard│                │              │
     │◄───────────┤                │              │
```

### 3. Job Application Flow (Subscription-Based)

```
┌─────────────┐              ┌─────────┐              ┌──────────┐
│ Freelancer  │              │ Backend │              │ Database │
│(No Subscr.) │              └────┬────┘              └────┬─────┘
└──────┬──────┘                   │                        │
       │                          │                        │
       │ 1. GET /jobs             │                        │
       ├─────────────────────────►│                        │
       │                          │                        │
       │                     2. Check auth                 │
       │                     3. Check subscription         │
       │                          ├───────────────────────►│
       │                          │  Query profile         │
       │                          │◄───────────────────────┤
       │                     4. subscription_status:       │
       │                        "inactive"                 │
       │                          │                        │
       │ 5. Return limited data   │                        │
       │    (titles only, preview)│                        │
       │◄─────────────────────────┤                        │
       │                          │                        │
       │ 6. Show "Subscribe to    │                        │
       │     unlock" banner       │                        │
       │                          │                        │
       │ 7. GET /jobs/:id         │                        │
       ├─────────────────────────►│                        │
       │                          │                        │
       │ 8. Return preview only   │                        │
       │    {preview_only: true}  │                        │
       │◄─────────────────────────┤                        │
       │                          │                        │
       │ 9. Show upgrade prompt   │                        │
```

### 4. Follow & Feed Flow

```
┌─────────┐              ┌─────────┐              ┌──────────┐
│ Client  │              │ Backend │              │ Database │
└────┬────┘              └────┬────┘              └────┬─────┘
     │                        │                        │
     │ 1. View freelancer     │                        │
     │    profile             │                        │
     │                        │                        │
     │ 2. Click "Follow"      │                        │
     ├───────────────────────►│                        │
     │                        │                        │
     │                   3. Check auth                 │
     │                   4. Validate freelancer_id     │
     │                        ├───────────────────────►│
     │                        │  Check if already      │
     │                        │  following             │
     │                        │◄───────────────────────┤
     │                   5. Create follow record       │
     │                        ├───────────────────────►│
     │                        │  Insert into follows   │
     │                        │◄───────────────────────┤
     │                        │                        │
     │ 6. Success response    │                        │
     │◄───────────────────────┤                        │
     │                        │                        │
     │ 7. Navigate to /feed   │                        │
     ├───────────────────────►│                        │
     │                        │                        │
     │                   8. Get followed freelancer    │
     │                      IDs                        │
     │                        ├───────────────────────►│
     │                        │  Query follows         │
     │                        │◄───────────────────────┤
     │                   9. Get posts from those       │
     │                      freelancers                │
     │                        ├───────────────────────►│
     │                        │  Query posts           │
     │                        │◄───────────────────────┤
     │                        │                        │
     │ 10. Return feed data   │                        │
     │◄───────────────────────┤                        │
     │                        │                        │
     │ 11. Display posts      │                        │
```

---

## Database Entity Relationship Diagram

```
┌──────────────────┐
│      users       │
│──────────────────│
│ id (PK)          │
│ email (UNIQUE)   │
│ name             │
│ password_hash    │
│ role             │
│ picture          │
└────────┬─────────┘
         │
         │ 1:1
         ▼
┌─────────────────────┐
│ freelancer_profiles │
│─────────────────────│
│ id (PK)             │
│ user_id (FK)        │◄─────────┐
│ title               │          │
│ bio                 │          │
│ skills              │          │
│ subscription_status │          │
└──────┬──────────────┘          │
       │                         │
       │ 1:N                     │
       ▼                         │
┌──────────────┐                 │
│   reviews    │                 │
│──────────────│                 │
│ id (PK)      │                 │
│ freelancer_id│                 │
│ client_id    │                 │
│ rating       │                 │
│ comment      │                 │
└──────────────┘                 │
                                 │
       ┌─────────────────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐       ┌──────────────┐
│    posts     │       │   follows    │
│──────────────│       │──────────────│
│ id (PK)      │       │ id (PK)      │
│ freelancer_id│       │ follower_id  │
│ user_id      │       │ freelancer_id│
│ content      │       └──────────────┘
│ image_url    │                │
└──────┬───────┘                │
       │                        │
       │ 1:N                    │
       ▼                        │
┌──────────────┐                │
│  post_likes  │                │
│──────────────│                │
│ id (PK)      │                │
│ post_id      │                │
│ user_id      │                │
└──────────────┘                │
                                │
┌──────────────┐                │
│     jobs     │                │
│──────────────│                │
│ id (PK)      │                │
│ client_id    │────────────────┘
│ title        │
│ description  │
│ budget       │
│ status       │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ job_applications │
│──────────────────│
│ id (PK)          │
│ job_id           │
│ freelancer_id    │
│ status           │
└──────────────────┘

┌─────────────┐
│  messages   │
│─────────────│
│ id (PK)     │
│ sender_id   │
│ receiver_id │
│ content     │
│ is_read     │
└─────────────┘

┌─────────────┐
│notifications│
│─────────────│
│ id (PK)     │
│ user_id     │
│ type        │
│ content     │
│ is_read     │
└─────────────┘

┌────────────────────┐
│ payment_txns       │
│────────────────────│
│ id (PK)            │
│ user_id            │
│ stripe_session_id  │
│ amount             │
│ status             │
└────────────────────┘
```

---

## Frontend Component Hierarchy

```
App.js
├── AuthProvider (Context)
│   └── AuthContext
│
├── BrowserRouter
│   └── Routes
│       ├── Landing
│       │   ├── Navbar
│       │   ├── Hero Section
│       │   ├── FreelancerCard (×N)
│       │   ├── JobCard (×N)
│       │   └── Footer
│       │
│       ├── Login
│       │   ├── Logo
│       │   ├── LoginForm
│       │   │   ├── EmailInput
│       │   │   ├── PasswordInput
│       │   │   └── SubmitButton
│       │   └── GoogleOAuthButtons
│       │
│       ├── Register
│       │   └── (Similar to Login)
│       │
│       ├── FreelancersList
│       │   ├── Navbar
│       │   ├── SearchBar
│       │   ├── Filters
│       │   ├── FreelancerCard (×N)
│       │   ├── Pagination
│       │   ├── Footer
│       │   └── MobileNav
│       │
│       ├── FreelancerProfile
│       │   ├── Navbar
│       │   ├── ProfileHeader
│       │   │   ├── Avatar
│       │   │   ├── FollowButton
│       │   │   ├── HireButton
│       │   │   └── MessageButton
│       │   ├── AboutSection
│       │   ├── SkillsSection
│       │   ├── PortfolioSection
│       │   ├── ReviewsSection
│       │   ├── Footer
│       │   └── MobileNav
│       │
│       ├── JobsList
│       │   ├── Navbar
│       │   ├── SubscriptionBanner (conditional)
│       │   ├── SearchBar
│       │   ├── Filters
│       │   ├── JobCard (×N)
│       │   ├── Pagination
│       │   ├── Footer
│       │   └── MobileNav
│       │
│       ├── JobDetail
│       │   ├── Navbar
│       │   ├── JobCard
│       │   │   ├── ClientInfo (conditional)
│       │   │   ├── JobDescription (conditional)
│       │   │   ├── ApplyButton (conditional)
│       │   │   └── MessageButton
│       │   ├── ApplicationsList (owner only)
│       │   ├── SubscriptionPrompt (non-subscribed)
│       │   ├── Footer
│       │   └── MobileNav
│       │
│       ├── Feed
│       │   ├── Navbar
│       │   ├── CreatePostForm (freelancers)
│       │   ├── PostCard (×N)
│       │   │   ├── Avatar
│       │   │   ├── PostContent
│       │   │   ├── PostImage
│       │   │   ├── LikeButton
│       │   │   └── DeleteButton (owner)
│       │   ├── EmptyState
│       │   ├── Footer
│       │   └── MobileNav
│       │
│       ├── Dashboard
│       │   ├── Navbar
│       │   ├── Stats Cards
│       │   ├── Quick Actions
│       │   ├── Recent Activity
│       │   ├── Footer
│       │   └── MobileNav
│       │
│       ├── Messages
│       │   ├── Navbar
│       │   ├── ConversationList
│       │   ├── MessageThread
│       │   ├── MessageInput
│       │   ├── Footer
│       │   └── MobileNav
│       │
│       └── Notifications
│           ├── Navbar
│           ├── NotificationCard (×N)
│           ├── Footer
│           └── MobileNav
│
└── Toaster (Global)
```

---

## State Management Flow

```
┌────────────────────────────────────────────────────┐
│              React Context API                      │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │         AuthContext (Global)               │   │
│  │                                            │   │
│  │  State:                                    │   │
│  │  • user (current user object)              │   │
│  │  • loading (auth check in progress)        │   │
│  │                                            │   │
│  │  Methods:                                  │   │
│  │  • login(email, password)                  │   │
│  │  • register(...)                           │   │
│  │  • loginWithGoogle(sessionId)              │   │
│  │  • logout()                                │   │
│  │  • checkAuth()                             │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│          Component Local State                      │
│                                                     │
│  Each Page/Component:                               │
│  • useState for local data                          │
│  • useEffect for data fetching                      │
│  • Custom hooks for reusable logic                  │
│                                                     │
│  Examples:                                          │
│  • JobsList: jobs, filters, pagination             │
│  • Feed: posts, newPost, likedPosts                │
│  • Messages: conversations, messages               │
└────────────────────────────────────────────────────┘
```

---

## API Request Flow

```
┌──────────┐                                    ┌──────────┐
│ Frontend │                                    │ Backend  │
│Component │                                    │ FastAPI  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ 1. User action (e.g., click button)          │
     │                                               │
     │ 2. axios.get/post/put/delete                 │
     │    with { withCredentials: true }            │
     ├──────────────────────────────────────────────►│
     │                                               │
     │                                          3. Ingress routes
     │                                             to backend:8001
     │                                               │
     │                                          4. FastAPI receives
     │                                             at /api/* endpoint
     │                                               │
     │                                          5. Middleware:
     │                                             - CORS check
     │                                             - Extract cookies
     │                                               │
     │                                          6. Route handler:
     │                                             - Parse request
     │                                             - Validate data
     │                                               │
     │                                          7. Auth check:
     │                                             - Get session token
     │                                             - Query sessions DB
     │                                             - Get user data
     │                                               │
     │                                          8. Business logic:
     │                                             - DB queries
     │                                             - Data processing
     │                                             - Validation
     │                                               │
     │                                          9. Response:
     │                                             - Format data
     │                                             - Exclude sensitive
     │                                             - Set headers
     │                                               │
     │ 10. Axios receives response                  │
     │◄──────────────────────────────────────────────┤
     │                                               │
     │ 11. Update component state                   │
     │     (setState/setData)                       │
     │                                               │
     │ 12. React re-renders                         │
     │     with new data                            │
```

---

## Deployment Flow

```
┌─────────────────┐
│   Developer     │
│   Git Push      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      GitHub Repository                  │
│      robertsaad/Freelanceov1            │
└────────┬────────────────────────────────┘
         │
         │ (Trigger)
         ▼
┌─────────────────────────────────────────┐
│    GitHub Actions CI/CD                 │
│                                         │
│  1. Run linters                         │
│  2. Run tests                           │
│  3. Build frontend (React)              │
│  4. Build backend (Docker image)        │
└────────┬────────────────────────────────┘
         │
         │ (Deploy)
         ▼
┌─────────────────────────────────────────┐
│       Azure Cloud                       │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Azure App Service (Backend)      │ │
│  │  - FastAPI container              │ │
│  │  - Auto-scaling enabled           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Azure Static Web Apps (Frontend) │ │
│  │  - React build artifacts          │ │
│  │  - CDN distribution               │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Azure Cosmos DB (MongoDB API)    │ │
│  │  - Managed database               │ │
│  │  - Automatic backups              │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Mobile Architecture (Capacitor)

```
┌──────────────────────────────────────────────────┐
│            Capacitor Core Layer                  │
│                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    │
│  │   iOS Native    │    │ Android Native  │    │
│  │   (Swift/ObjC)  │    │   (Kotlin/Java) │    │
│  └────────┬────────┘    └────────┬────────┘    │
│           │                      │              │
│           └──────────┬───────────┘              │
│                      │                          │
│         ┌────────────▼───────────┐              │
│         │  Capacitor Bridge      │              │
│         │  JavaScript ⟷ Native   │              │
│         └────────────┬───────────┘              │
└──────────────────────┼──────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              Web Layer (React)                   │
│                                                  │
│  Same React application as web version          │
│  • All components work without modification      │
│  • Capacitor plugins for native features         │
│  • Responsive design for mobile screens          │
└──────────────────────────────────────────────────┘

Native Features Available:
• Camera
• Push Notifications
• Biometric Auth
• Local Storage
• File System
• Geolocation
• Splash Screen
• Status Bar
```

---

This document provides visual representations of the Freelanceo architecture, data flows, and system interactions.
