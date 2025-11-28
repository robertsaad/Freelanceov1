# FreelanceHub - Azure Deployment

This folder contains everything needed to deploy the FreelanceHub application to Azure.

## 📋 Prerequisites

1. **Azure CLI** installed ([Install Guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
2. **Azure Subscription** with permissions to create resources
3. **GitHub Account** with the repository containing the code
4. **GitHub Personal Access Token** with `repo` and `workflow` permissions
5. **Stripe Account** with API keys

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Azure Cloud                              │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │  Static Web Apps    │───▶│    App Service      │         │
│  │  (Frontend/React)   │    │  (Backend/FastAPI)  │         │
│  │  - Auto SSL         │    │  - Python 3.11      │         │
│  │  - CDN              │    │  - Gunicorn         │         │
│  └─────────────────────┘    └──────────┬──────────┘         │
│                                        │                     │
│                              ┌─────────▼─────────┐          │
│                              │   Cosmos DB       │          │
│                              │  (MongoDB API)    │          │
│                              │  - 11 Collections │          │
│                              │  - Indexed        │          │
│                              └───────────────────┘          │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │  Application        │    │   Log Analytics    │          │
│  │  Insights           │    │   Workspace        │          │
│  └─────────────────────┘    └─────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Files

| File | Description |
|------|-------------|
| `azuredeploy.json` | Main ARM template |
| `azuredeploy.parameters.json` | Parameters file (configure this) |
| `deploy.sh` | Automated deployment script |

## 🚀 Quick Deployment

### Step 1: Configure Parameters

Edit `azuredeploy.parameters.json` with your values:

```json
{
  "githubRepoUrl": { "value": "https://github.com/YOUR_USERNAME/freelancehub" },
  "githubToken": { "value": "ghp_xxxxxxxxxxxx" },
  "stripeApiKey": { "value": "sk_test_xxxxxxxxxxxx" }
}
```

### Step 2: Login to Azure

```bash
az login
```

### Step 3: Create Resource Group

```bash
az group create --name freelancehub-rg --location eastus2
```

### Step 4: Deploy

```bash
az deployment group create \
  --resource-group freelancehub-rg \
  --template-file azuredeploy.json \
  --parameters @azuredeploy.parameters.json
```

### Step 5: Get Output URLs

```bash
az deployment group show \
  --resource-group freelancehub-rg \
  --name azuredeploy \
  --query properties.outputs
```

## 🔧 Manual Steps After Deployment

1. **Update CORS** (if needed): Go to Azure Portal → App Service → CORS
2. **Custom Domain**: Configure in Static Web Apps settings
3. **Stripe Webhook**: Set webhook URL to `https://your-api.azurewebsites.net/api/webhook/stripe`

## 💰 Estimated Costs (Test Environment)

| Service | SKU | Monthly Cost |
|---------|-----|-------------|
| Static Web Apps | Free | $0 |
| App Service | B1 | ~$13 |
| Cosmos DB | 400 RU/s | ~$24 (or Free Tier) |
| Application Insights | Basic | ~$2 |
| **Total** | | **~$39/month** |

## 🔐 Security Notes

- Never commit `azuredeploy.parameters.json` with real secrets
- Use Azure Key Vault for production secrets
- Enable Azure AD authentication for production
- Review CORS settings before going live

## 🆘 Troubleshooting

### Backend not starting
```bash
az webapp log tail --name YOUR_BACKEND_APP --resource-group freelancehub-rg
```

### Check deployment status
```bash
az deployment group list --resource-group freelancehub-rg
```

### Restart services
```bash
az webapp restart --name YOUR_BACKEND_APP --resource-group freelancehub-rg
```
