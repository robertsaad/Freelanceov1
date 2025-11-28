# FreelanceHub - Freelancer Portfolio Platform

A modern platform where freelancers can showcase their portfolios and clients can discover and hire talent.

## 🚀 Features

- **For Freelancers**
  - Create detailed profiles with bio, skills, and hourly rates
  - Upload portfolio items to showcase work
  - Subscribe to be visible to clients (Stripe integration)
  - Receive hiring requests from clients
  - Post updates to followers

- **For Clients**
  - Browse and search freelancers by category, skills, rating
  - View freelancer portfolios and reviews
  - Send hiring requests
  - Message freelancers directly
  - Leave reviews and ratings

- **Mobile Features**
  - Bottom navigation bar (Feed, Talent, Messages, Alerts)
  - Follow freelancers and see their posts
  - Real-time notifications
  - PWA / Capacitor ready for iOS/Android

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Tailwind CSS + Shadcn UI |
| Backend | FastAPI (Python 3.11) |
| Database | MongoDB |
| Auth | JWT + Google OAuth (Emergent) |
| Payments | Stripe |
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
