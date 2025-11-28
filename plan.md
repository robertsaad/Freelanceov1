# Freelancer Portfolio Platform - MVP Plan

## Overview
A freelancer portfolio marketplace where:
- Freelancers can subscribe (paid via Stripe) to showcase their profiles and portfolios
- Clients can search, filter, and contact freelancers for hiring

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Authentication**: Emergent Google OAuth + JWT Email/Password
- **Payments**: Stripe Subscriptions (via emergentintegrations)

## Design Theme
- Clean light theme with modern aesthetics
- Primary color: Teal/Cyan (#0891b2)
- Accent: Indigo (#6366f1)
- Background: Clean whites and light grays

---

## Database Schema (MongoDB Collections)

### 1. users
```json
{
  "_id": "ObjectId",
  "id": "uuid",
  "email": "string (unique)",
  "name": "string",
  "picture": "string (avatar URL)",
  "role": "freelancer | client",
  "password_hash": "string (nullable - for email auth)",
  "auth_provider": "google | email",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 2. freelancer_profiles
```json
{
  "_id": "ObjectId",
  "id": "uuid",
  "user_id": "string (ref users.id)",
  "title": "string (professional title)",
  "bio": "string",
  "skills": ["string"],
  "category": "string (Web Development, Design, etc.)",
  "hourly_rate": "number",
  "experience_years": "number",
  "portfolio_items": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "image_url": "string",
      "link": "string"
    }
  ],
  "location": "string",
  "is_available": "boolean",
  "subscription_status": "active | inactive | expired",
  "subscription_expires_at": "datetime",
  "average_rating": "number",
  "total_reviews": "number",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 3. reviews
```json
{
  "_id": "ObjectId",
  "id": "uuid",
  "freelancer_id": "string (ref freelancer_profiles.id)",
  "client_id": "string (ref users.id)",
  "rating": "number (1-5)",
  "comment": "string",
  "created_at": "datetime"
}
```

### 4. messages
```json
{
  "_id": "ObjectId",
  "id": "uuid",
  "sender_id": "string",
  "receiver_id": "string",
  "content": "string",
  "is_read": "boolean",
  "created_at": "datetime"
}
```

### 5. hiring_requests
```json
{
  "_id": "ObjectId",
  "id": "uuid",
  "client_id": "string",
  "freelancer_id": "string",
  "project_title": "string",
  "project_description": "string",
  "budget": "number",
  "status": "pending | accepted | rejected | completed",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 6. payment_transactions
```json
{
  "_id": "ObjectId",
  "id": "uuid",
  "user_id": "string",
  "session_id": "string",
  "amount": "number",
  "currency": "string",
  "package_type": "monthly | yearly",
  "payment_status": "pending | paid | failed | expired",
  "metadata": "object",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### 7. sessions (auth sessions)
```json
{
  "_id": "ObjectId",
  "session_token": "string",
  "user_id": "string",
  "expires_at": "datetime",
  "created_at": "datetime"
}
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Email registration
- `POST /api/auth/login` - Email login
- `POST /api/auth/google-session` - Process Google OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Freelancer Profiles
- `GET /api/freelancers` - List freelancers (with filters: category, skills, rating, search)
- `GET /api/freelancers/{id}` - Get freelancer profile
- `POST /api/freelancers/profile` - Create freelancer profile
- `PUT /api/freelancers/profile` - Update freelancer profile
- `POST /api/freelancers/portfolio` - Add portfolio item
- `DELETE /api/freelancers/portfolio/{item_id}` - Remove portfolio item

### Reviews
- `GET /api/freelancers/{id}/reviews` - Get freelancer reviews
- `POST /api/freelancers/{id}/reviews` - Add review (clients only)

### Messages
- `GET /api/messages` - Get user's conversations
- `GET /api/messages/{user_id}` - Get conversation with specific user
- `POST /api/messages` - Send message

### Hiring Requests
- `POST /api/hiring-requests` - Create hiring request
- `GET /api/hiring-requests` - Get user's hiring requests
- `PUT /api/hiring-requests/{id}` - Update request status

### Payments (Stripe)
- `POST /api/payments/checkout` - Create subscription checkout
- `GET /api/payments/status/{session_id}` - Get payment status
- `POST /api/webhook/stripe` - Stripe webhook handler

---

## Frontend Pages/Routes

1. **/** - Landing page (hero, featured freelancers, categories)
2. **/login** - Login page (Google + Email)
3. **/register** - Registration page
4. **/freelancers** - Browse freelancers (search, filters)
5. **/freelancers/:id** - Freelancer profile detail
6. **/dashboard** - User dashboard
7. **/dashboard/profile** - Edit profile (freelancers)
8. **/dashboard/messages** - Messages inbox
9. **/dashboard/requests** - Hiring requests
10. **/pricing** - Subscription plans
11. **/payment/success** - Payment success
12. **/payment/cancel** - Payment cancelled

---

## Subscription Plans
- **Monthly**: $19.99/month
- **Yearly**: $149.99/year (save 37%)

---

## Features Summary

### For Freelancers
- Create detailed profile with bio, skills, hourly rate
- Add portfolio items (projects with images/links)
- Subscribe to be visible on platform
- Receive hiring requests
- Message clients
- View reviews and ratings

### For Clients
- Browse and search freelancers
- Filter by category, skills, rating, availability
- View freelancer portfolios
- Send hiring requests
- Message freelancers
- Leave reviews

---

## Images to Use
- Hero: https://images.unsplash.com/photo-1517817748493-49ec54a32465
- Web Dev Category: https://images.unsplash.com/photo-1498050108023-c5249f4df085
- Design Category: https://images.unsplash.com/photo-1557243962-0a093922933f
- Professional Avatars:
  - https://images.unsplash.com/photo-1644904105846-095e45fca990
  - https://images.pexels.com/photos/9072338/pexels-photo-9072338.jpeg
