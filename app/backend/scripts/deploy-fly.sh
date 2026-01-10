#!/bin/bash
# Deploy Ignition API to Fly.io
#
# Usage: ./scripts/deploy-fly.sh
#
# Prerequisites:
#   - flyctl installed and authenticated
#   - In app/backend directory

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Change to backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

log_info "Deploying from: $BACKEND_DIR"

# Check prerequisites
if ! command -v flyctl &> /dev/null; then
    log_error "flyctl is not installed. Install with: brew install flyctl"
    exit 1
fi

# Check Fly auth
if ! flyctl auth whoami &> /dev/null; then
    log_error "Not authenticated. Run: flyctl auth login"
    exit 1
fi

log_info "Authenticated as: $(flyctl auth whoami)"

# Check secrets are set
log_info "Checking secrets..."
SECRETS=$(flyctl secrets list --app ignition-api 2>/dev/null || true)
if ! echo "$SECRETS" | grep -q "DATABASE_URL"; then
    log_warn "DATABASE_URL secret not found!"
    log_warn "Set it with: flyctl secrets set DATABASE_URL='...' --app ignition-api"
fi

# Deploy
log_info "Starting deploy to Fly.io..."
flyctl deploy --app ignition-api --remote-only

# Wait for health check
log_info "Waiting for health check..."
sleep 5

# Health check
log_info "Running health check..."
HEALTH=$(curl -s https://api.ecent.online/health || echo "FAILED")
if echo "$HEALTH" | grep -q "healthy"; then
    log_info "✅ Health check passed: $HEALTH"
else
    log_error "❌ Health check failed: $HEALTH"
    exit 1
fi

log_info "✅ Deployment complete!"
