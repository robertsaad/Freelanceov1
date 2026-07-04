# FreelanceHub - Freelancer Portfolio Platform

A modern platform where freelancers can showcase their portfolios and clients can discover and hire talent.

## 🚀 Features

- **For Freelancers**
  - Multi-step onboarding wizard, then a detailed profile (bio, skills, hourly rate)
  - Upload portfolio media (image/video/audio, up to 50 MB) via Azure Blob Storage
  - Subscribe to be visible to clients (Stripe) — $19.99/mo or $149.99/yr, 0% commission
  - Receive hiring requests and track engagements via **Contracts & Work Diary**
  - Freelancer **Statistics** and **Account Health** dashboards
  - Post updates to followers

- **For Clients**
  - Browse and search freelancers by category, skills, rating
  - View freelancer portfolios and reviews
  - Send hiring requests (accepted requests become contracts)
  - Message freelancers directly
  - Leave reviews and ratings

- **Admin**
  - Admin panel for users, freelancers, jobs, payments, and categories

- **Mobile Features**
  - Bottom navigation bar (Feed, Talent, Messages, Alerts)
  - Follow freelancers and see their posts
  - Notifications
  - PWA / Capacitor ready for iOS/Android

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Tailwind CSS + Shadcn UI (CRACO) |
| Backend | FastAPI (Python 3.11) |
| Database | Azure Cosmos DB for MongoDB (serverless) |
| Media | Azure Blob Storage |
| Auth | JWT + Google OAuth |
| Payments | Stripe |
| Hosting | Azure App Service + Azure Static Web Apps |
| CI/CD | GitHub Actions (push-to-deploy on `main`) |
| Mobile | Capacitor (iOS/Android) |

## 📁 Project Structure

```
├── backend/              # FastAPI backend
│   ├── server.py         # Main API application
│   └── requirements.txt  # Python dependencies
├── frontend/             # React frontend
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── package.json      # Node dependencies
├── azure-deployment/     # Azure ARM templates
└── .github/workflows/    # CI/CD pipelines
```

## 🛠️ Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env      # Configure your environment
uvicorn server:app --reload --port 8001
```

### Frontend Setup
```bash
cd frontend
yarn install
cp .env.example .env      # Configure your environment
yarn start
```

## ☁️ Azure Deployment

See [azure-deployment/README.md](azure-deployment/README.md) for full deployment instructions.

Quick deploy:
```bash
cd azure-deployment
./deploy.sh
```

## 📱 Mobile App (Capacitor)

```bash
cd frontend
yarn build
npx cap sync
npx cap open ios     # or android
```

## 🔑 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=freelancer_platform
JWT_SECRET=your-secret-key
STRIPE_API_KEY=sk_test_xxx
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 📄 License

MIT License
