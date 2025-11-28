# ============================================
# FreelanceHub - GitHub Repository Setup Guide
# ============================================

## Repository Structure

Your repository should look like this:

```
freelancehub/
├── .github/
│   └── workflows/
│       ├── azure-backend.yml      # Backend CI/CD
│       └── azure-frontend.yml     # Frontend CI/CD
├── azure-deployment/
│   ├── azuredeploy.json           # ARM template
│   ├── azuredeploy.parameters.json # Parameters
│   ├── deploy.sh                   # Deployment script
│   └── README.md                   # Deployment docs
├── backend/
│   ├── server.py                   # FastAPI app
│   ├── requirements.txt            # Python deps
│   └── .env.example                # Example env file
├── frontend/
│   ├── src/                        # React source
│   ├── public/                     # Static files
│   ├── package.json                # Node deps
│   └── .env.example                # Example env file
└── README.md
```

## GitHub Secrets Required

Go to: Repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AZURE_CREDENTIALS` | Azure Service Principal | See below |
| `AZURE_BACKEND_APP_NAME` | Backend App Service name | From ARM deployment output |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web App token | Azure Portal |
| `REACT_APP_BACKEND_URL` | Backend API URL | From ARM deployment output |

### Creating Azure Service Principal

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac \
  --name "FreelanceHub-GitHub" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/freelancehub-rg \
  --sdk-auth
```

Copy the entire JSON output and save it as `AZURE_CREDENTIALS` secret.

### Getting Static Web Apps API Token

1. Go to Azure Portal
2. Navigate to your Static Web App
3. Go to "Manage deployment token" in Overview
4. Copy the token and save as `AZURE_STATIC_WEB_APPS_API_TOKEN`

## Files NOT to Commit

Add to `.gitignore`:

```gitignore
# Environment files with secrets
backend/.env
frontend/.env
azure-deployment/azuredeploy.parameters.json

# Build outputs
frontend/build/
frontend/node_modules/
backend/__pycache__/
backend/venv/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

## Deployment Flow

```
┌─────────────┐
│  Git Push   │
│  to main   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         GitHub Actions              │
│  ┌────────────┐  ┌────────────┐  │
│  │  Backend   │  │  Frontend  │  │
│  │  Workflow  │  │  Workflow  │  │
│  └──────┬─────┘  └──────┬─────┘  │
└───────────┬────────────┬───────────┘
           │            │
           ▼            ▼
    ┌────────────┐  ┌──────────────┐
    │ App Service │  │ Static Web   │
    │ (Backend)   │  │ Apps (Front) │
    └────────────┘  └──────────────┘
```

## Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/freelancehub.git
cd freelancehub

# Deploy to Azure (first time)
cd azure-deployment
./deploy.sh

# After changes, just push to main
git add .
git commit -m "Your changes"
git push origin main
# GitHub Actions will auto-deploy!
```
