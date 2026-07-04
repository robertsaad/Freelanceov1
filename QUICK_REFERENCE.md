# Freelanceo - Quick Reference Guide

## Demo Accounts

### Client Account
```
Email: demo.client@freelanceo.com
Password: Client123!
Name: Sarah Johnson
Role: Client
```

### Freelancer Account
```
Email: demo.freelancer@freelanceo.com
Password: Freelancer123!
Name: Alex Thompson
Role: Freelancer (with active subscription)
Profile: Full-Stack Developer & UI/UX Designer
```

---

## Quick Access URLs

**Live (Azure test environment)**
- Frontend: https://proud-dune-0f5f5910f.7.azurestaticapps.net
- Backend API: https://freelanceo-api-4uaszdvubu3ck.azurewebsites.net/api
- Repo: https://github.com/robertsaad/Freelanceov1

| Page | URL | Access |
|------|-----|--------|
| Homepage | `/` | Public |
| Login | `/login` | Public |
| Register | `/register` | Public |
| Freelancers | `/freelancers` | Public |
| Jobs | `/jobs` | Public (limited for non-subscribed) |
| Feed | `/feed` | Authenticated |
| Dashboard | `/dashboard` | Authenticated |
| Messages | `/dashboard/messages` | Authenticated |
| Notifications | `/notifications` | Authenticated |
| Pricing | `/pricing` | Public |
| Onboarding | `/onboarding` | Freelancers only |
| Edit Profile | `/dashboard/profile` | Freelancers only |
| Billing | `/dashboard/billing` | Freelancers only |
| Statistics | `/dashboard/stats` | Freelancers only |
| Account Health | `/dashboard/account-health` | Freelancers only |
| Contracts | `/dashboard/contracts` | Authenticated |
| Contract Detail | `/dashboard/contracts/:id` | Participants |
| Hiring Requests | `/dashboard/requests` | Authenticated |
| Post Job | `/jobs/post` | Clients only |
| Admin | `/admin` | Admin only |

---

## Key Features Checklist

### ✅ Authentication
- [x] Email/Password registration
- [x] Email/Password login
- [x] Google OAuth (Emergent managed)
- [x] Session management (7-day expiry)
- [x] Logout functionality
- [x] Protected routes

### ✅ User Roles
- [x] Client role
- [x] Freelancer role
- [x] Role-based access control
- [x] Role-specific features

### ✅ Freelancer Features
- [x] Create/edit profile
- [x] Portfolio management
- [x] Skills showcase
- [x] Hourly rate display
- [x] Availability toggle
- [x] Subscription management
- [x] Browse jobs (preview without subscription)
- [x] Apply for jobs (requires subscription)
- [x] Create posts
- [x] Receive follows
- [x] View applications

### ✅ Client Features
- [x] Browse freelancers
- [x] View freelancer profiles
- [x] Follow freelancers
- [x] Post jobs
- [x] Edit/delete jobs
- [x] View applications
- [x] Message freelancers
- [x] Send hiring requests
- [x] View feed
- [x] Blocked from job browsing

### ✅ Job Board
- [x] Post jobs (clients)
- [x] Job search & filters
- [x] Category filtering
- [x] Skills filtering
- [x] Budget range filtering
- [x] Remote job filtering
- [x] Job applications (freelancers)
- [x] Application tracking
- [x] Subscription-based access control
- [x] Limited preview for non-subscribers

### ✅ Social Features
- [x] Follow/unfollow freelancers
- [x] Personalized feed
- [x] Create posts (text + images)
- [x] Like/unlike posts
- [x] Delete own posts
- [x] View followers

### ✅ Subscription System
- [x] Monthly plan ($19.99)
- [x] Yearly plan ($149.99)
- [x] Stripe integration
- [x] Subscription status tracking
- [x] Access control based on subscription
- [x] Payment success handling
- [x] Subscription activation

### ✅ Communication
- [x] Direct messaging
- [x] Conversation list
- [x] Unread message indicators
- [x] Hiring requests
- [x] Notifications system
- [x] Unread notification count

### ✅ UI/UX
- [x] Responsive design
- [x] Mobile navigation (bottom bar)
- [x] Desktop navigation (mega menus)
- [x] Professional branding
- [x] Toast notifications
- [x] Loading states
- [x] Empty states
- [x] Error handling

### ✅ Reviews & Ratings
- [x] 5-star rating system
- [x] Written reviews
- [x] Average rating calculation
- [x] Review count display

### ✅ Contracts & Work Diary (v1.1)
- [x] Auto-create contract when a hiring request is accepted
- [x] Contracts list with summary counts, search, filter, sort
- [x] Contract detail with status actions (complete / end)
- [x] Work diary (add/list/delete dated notes)

### ✅ Freelancer Tools (v1.1)
- [x] Multi-step onboarding wizard
- [x] Statistics dashboard
- [x] Account Health page
- [x] Membership & Billing page + profile-completion widget
- [x] Portfolio media uploads (image/video/audio via Azure Blob)

### ✅ Admin (v1.1)
- [x] Platform stats
- [x] Manage users / freelancers / jobs / payments
- [x] Manage categories (create/delete/seed)

---

## Environment Variables

### Frontend (`/app/frontend/.env`)
```bash
REACT_APP_BACKEND_URL=https://talent-market-17.preview.emergentagent.com
```

### Backend (`/app/backend/.env`)
```bash
MONGO_URL=mongodb://127.0.0.1:27017/
DB_NAME=freelancer_platform
JWT_SECRET=super_secret_key
JWT_ALGORITHM=HS256
STRIPE_API_KEY=sk_test_emergent
```

---

## Common Commands

### Frontend
```bash
# Start development server
cd /app/frontend
yarn start

# Install dependencies
yarn install

# Build for production
yarn build

# Lint code
yarn lint

# Capacitor (mobile)
npx cap sync ios
npx cap open ios
npx cap sync android
npx cap open android
```

### Backend
```bash
# Start server
cd /app/backend
python server.py

# Install dependencies
pip install -r requirements.txt

# Update requirements
pip freeze > requirements.txt

# Python linting
ruff check server.py
```

### Supervisor (Process Management)
```bash
# Restart services
sudo supervisorctl restart frontend
sudo supervisorctl restart backend

# Check status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.err.log
tail -f /var/log/supervisor/backend.err.log
```

### Database
```bash
# Connect to MongoDB
mongosh mongodb://127.0.0.1:27017/freelancer_platform

# Common queries
db.users.find().pretty()
db.freelancer_profiles.find().pretty()
db.jobs.find().pretty()
db.follows.find().pretty()
db.posts.find().pretty()

# Count documents
db.users.countDocuments()
db.jobs.countDocuments({status: "open"})

# Update subscription
db.freelancer_profiles.updateOne(
  {user_id: "USER_ID"},
  {$set: {subscription_status: "active"}}
)
```

---

## API Testing Examples

### Register User
```bash
curl -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User",
    "role": "client"
  }'
```

### Login
```bash
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Get Current User
```bash
curl -X GET "http://localhost:8001/api/auth/me" \
  -b cookies.txt
```

### List Freelancers
```bash
curl -X GET "http://localhost:8001/api/freelancers?category=Web%20Development&page=1&limit=10"
```

### Create Job (Client)
```bash
curl -X POST "http://localhost:8001/api/jobs" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Build React App",
    "description": "Need a developer...",
    "category": "Web Development",
    "skills_required": ["React", "Node.js"],
    "budget_min": 1000,
    "budget_max": 3000,
    "budget_type": "fixed",
    "remote": true
  }'
```

### Follow Freelancer
```bash
curl -X POST "http://localhost:8001/api/freelancers/PROFILE_ID/follow" \
  -b cookies.txt
```

### Create Post (Freelancer)
```bash
curl -X POST "http://localhost:8001/api/posts" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "content": "Just finished a new project!",
    "image_url": "https://example.com/image.jpg"
  }'
```

---

## Port Numbers

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | React development server |
| Backend | 8001 | FastAPI server |
| MongoDB | 27017 | Database |

---

## External Service Keys

### Stripe (Test Mode)
```bash
STRIPE_API_KEY=sk_test_emergent
# Test card: 4242 4242 4242 4242
# Expiry: Any future date
# CVC: Any 3 digits
```

### Emergent Auth
```bash
# OAuth endpoint: https://auth.emergentagent.com/
# Verification API: https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data
```

### Posthog (Analytics)
```bash
# Project key: phc_yJW1VjHGGwmCbbrtczfqqNxgBDbhlhOWcdzcIJEOTFE
# Host: https://us.i.posthog.com
```

---

## Color Scheme

| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Cyan) | #0891b2 | Buttons, links, accents |
| Secondary (Indigo) | #4f46e5 | Job cards, badges |
| Success (Green) | #10b981 | Success messages, active status |
| Warning (Yellow) | #f59e0b | Warnings, preview badges |
| Error (Red) | #ef4444 | Errors, delete actions |
| Gray | #6b7280 | Text, borders |

---

## Typography

| Element | Size | Weight |
|---------|------|--------|
| H1 (Hero) | 4xl-6xl | Bold |
| H2 (Page Title) | 3xl | Bold |
| H3 (Section) | xl | Semibold |
| Body | base | Normal |
| Small | sm | Normal |
| Tiny | xs | Normal |

---

## Common Issues & Solutions

### Issue: Frontend not loading
```bash
# Check if service is running
sudo supervisorctl status frontend

# Restart service
sudo supervisorctl restart frontend

# Check logs
tail -f /var/log/supervisor/frontend.err.log
```

### Issue: Backend API errors
```bash
# Check backend logs
tail -f /var/log/supervisor/backend.err.log

# Restart backend
sudo supervisorctl restart backend

# Check MongoDB connection
mongosh mongodb://127.0.0.1:27017/
```

### Issue: CORS errors
```bash
# Verify REACT_APP_BACKEND_URL in frontend/.env
# Should match the actual backend URL
# Restart frontend after .env changes
```

### Issue: Authentication not working
```bash
# Check session in MongoDB
db.sessions.find().pretty()

# Clear browser cookies
# Try in incognito/private window
```

### Issue: Subscription not activating
```bash
# Manually activate in MongoDB
db.freelancer_profiles.updateOne(
  {user_id: "USER_ID"},
  {$set: {
    subscription_status: "active",
    subscription_expires_at: new Date(Date.now() + 365*24*60*60*1000).toISOString()
  }}
)
```

---

## Performance Tips

1. **Enable React production build**
   ```bash
   yarn build
   ```

2. **Database indexing**
   - Already indexed: email, user_id, freelancer_id, category, skills

3. **Image optimization**
   - Use WebP format
   - Compress images before upload
   - Use CDN for hosting

4. **Lazy loading**
   - Implement React.lazy() for routes
   - Use Intersection Observer for images

5. **Caching**
   - Enable browser caching
   - Use Redis for session storage (future)

---

## Security Checklist

- [x] Password hashing (BCrypt)
- [x] HttpOnly cookies
- [x] JWT token expiration
- [x] Input validation (Pydantic)
- [x] CORS configuration
- [x] Role-based access control
- [x] Session management
- [ ] Rate limiting (future)
- [ ] Two-factor authentication (future)
- [ ] CSRF protection (future)

---

## Monitoring & Analytics

### Posthog Events
- Page views
- User registration
- User login
- Job creation
- Job application
- Follow action
- Post creation
- Message sent

### Key Metrics to Track
- Daily active users (DAU)
- Monthly active users (MAU)
- Conversion rate (free → paid)
- Job posting rate
- Application rate
- Message volume
- User retention

---

## Testing Strategy

### Manual Testing
1. User registration/login
2. Profile creation
3. Job posting
4. Job application
5. Following users
6. Creating posts
7. Messaging
8. Payment flow

### Automated Testing
```bash
# Use testing agents for comprehensive tests
# Backend: deep_testing_backend_v2
# Frontend: auto_frontend_testing_agent
```

### Test Accounts
- Use demo accounts provided above
- Create additional test accounts as needed
- Test different user roles

---

## Deployment Checklist

### Pre-deployment
- [ ] Run linters (Python, JavaScript)
- [ ] Run tests
- [ ] Update environment variables
- [ ] Review .env files
- [ ] Check database migrations
- [ ] Update documentation

### Deployment
- [ ] Build frontend (`yarn build`)
- [ ] Push to GitHub
- [ ] Trigger CI/CD pipeline
- [ ] Monitor deployment logs
- [ ] Verify deployment

### Post-deployment
- [ ] Test critical paths
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Verify external services
- [ ] Update status page

---

## Support & Resources

### Documentation
- `/app/TECHNICAL_DOCUMENTATION.md` - Complete technical docs
- `/app/ARCHITECTURE_DIAGRAMS.md` - Visual architecture
- `/app/QUICK_REFERENCE.md` - This file

### Repository
- GitHub: `robertsaad/Freelanceov1`

### Deployment
- Frontend: Azure Static Web Apps
- Backend: Azure App Service
- Database: Azure Cosmos DB (MongoDB API)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 29, 2025 | Initial release with all core features |

---

**Last Updated:** November 29, 2025
