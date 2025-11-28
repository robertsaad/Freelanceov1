#!/bin/bash

# ============================================
# FreelanceHub Azure Deployment Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FreelanceHub - Azure Deployment Script           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
RESOURCE_GROUP="freelancehub-rg"
LOCATION="eastus2"
TEMPLATE_FILE="azuredeploy.json"
PARAMETERS_FILE="azuredeploy.parameters.json"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed.${NC}"
    echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
echo -e "${YELLOW}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Opening browser for authentication...${NC}"
    az login
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}✓ Logged in to subscription: $SUBSCRIPTION${NC}"

# Check if parameters file exists
if [ ! -f "$PARAMETERS_FILE" ]; then
    echo -e "${RED}Error: Parameters file not found: $PARAMETERS_FILE${NC}"
    echo "Please create and configure the parameters file."
    exit 1
fi

# Validate parameters file has been configured
if grep -q "YOUR_USERNAME" "$PARAMETERS_FILE"; then
    echo -e "${RED}Error: Please configure $PARAMETERS_FILE with your actual values.${NC}"
    echo "Replace placeholders like YOUR_USERNAME, YOUR_REPO, etc."
    exit 1
fi

# Ask for confirmation
echo -e "\n${YELLOW}Deployment Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Template: $TEMPLATE_FILE"
echo "  Parameters: $PARAMETERS_FILE"
echo ""

read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# Create Resource Group
echo -e "\n${BLUE}Step 1/4: Creating Resource Group...${NC}"
if az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo -e "${YELLOW}Resource group already exists. Using existing group.${NC}"
else
    az group create --name $RESOURCE_GROUP --location $LOCATION --output none
    echo -e "${GREEN}✓ Resource group created${NC}"
fi

# Validate Template
echo -e "\n${BLUE}Step 2/4: Validating ARM Template...${NC}"
az deployment group validate \
    --resource-group $RESOURCE_GROUP \
    --template-file $TEMPLATE_FILE \
    --parameters @$PARAMETERS_FILE \
    --output none
echo -e "${GREEN}✓ Template validation passed${NC}"

# Deploy
echo -e "\n${BLUE}Step 3/4: Deploying resources (this may take 10-15 minutes)...${NC}"
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file $TEMPLATE_FILE \
    --parameters @$PARAMETERS_FILE \
    --query properties.outputs \
    --output json)

echo -e "${GREEN}✓ Deployment completed${NC}"

# Extract outputs
echo -e "\n${BLUE}Step 4/4: Extracting deployment outputs...${NC}"

FRONTEND_URL=$(echo $DEPLOYMENT_OUTPUT | jq -r '.frontendUrl.value')
BACKEND_URL=$(echo $DEPLOYMENT_OUTPUT | jq -r '.backendUrl.value')
STATIC_APP_NAME=$(echo $DEPLOYMENT_OUTPUT | jq -r '.staticWebAppName.value')
BACKEND_APP_NAME=$(echo $DEPLOYMENT_OUTPUT | jq -r '.backendAppName.value')
COSMOS_DB_NAME=$(echo $DEPLOYMENT_OUTPUT | jq -r '.cosmosDbAccountName.value')

# Print results
echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            🎉 Deployment Successful! 🎉                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}Your Application URLs:${NC}"
echo "─────────────────────────────────────────────────────────────"
echo -e "  Frontend:  ${GREEN}$FRONTEND_URL${NC}"
echo -e "  Backend:   ${GREEN}$BACKEND_URL${NC}"
echo -e "  API Health: ${GREEN}$BACKEND_URL/api/health${NC}"
echo ""

echo -e "${BLUE}Azure Resources Created:${NC}"
echo "─────────────────────────────────────────────────────────────"
echo "  Static Web App:  $STATIC_APP_NAME"
echo "  App Service:     $BACKEND_APP_NAME"
echo "  Cosmos DB:       $COSMOS_DB_NAME"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "─────────────────────────────────────────────────────────────"
echo "1. Wait 5-10 minutes for GitHub Actions to complete deployment"
echo "2. Test the frontend: $FRONTEND_URL"
echo "3. Test the API: $BACKEND_URL/api/health"
echo "4. Configure Stripe webhook URL:"
echo "   $BACKEND_URL/api/webhook/stripe"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo "─────────────────────────────────────────────────────────────"
echo "# View backend logs:"
echo "az webapp log tail --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "# Restart backend:"
echo "az webapp restart --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "# Delete all resources:"
echo "az group delete --name $RESOURCE_GROUP --yes --no-wait"
echo ""

echo -e "${GREEN}Deployment complete! 🚀${NC}"
