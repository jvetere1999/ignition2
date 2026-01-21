#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ignition-api"
MACHINES=("080205ef244658" "e82543df39e978")
BACKEND_DIR="$(cd "$(dirname "$0")/../app/backend" && pwd)"

echo -e "${BLUE}=== Ignition API Deployment & Migration Script ===${NC}\n"

# Parse flags
SKIP_DEPLOY=false
SKIP_MIGRATIONS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-deploy)
      SKIP_DEPLOY=true
      shift
      ;;
    --skip-migrations)
      SKIP_MIGRATIONS=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--skip-deploy] [--skip-migrations]"
      exit 1
      ;;
  esac
done

# Step 1: Optional Deploy
if [ "$SKIP_DEPLOY" = false ]; then
  echo -e "${YELLOW}Step 1: Building and deploying new image...${NC}"
  cd "$BACKEND_DIR"
  touch migrations/0001_schema.sql  # Bust Docker cache
  flyctl deploy --app "$APP_NAME"
  echo -e "${GREEN}✓ Deploy complete${NC}\n"
else
  echo -e "${YELLOW}Step 1: Skipping deploy${NC}\n"
fi

# Step 2: Stop machines
echo -e "${YELLOW}Step 2: Stopping Fly machines...${NC}"
for machine in "${MACHINES[@]}"; do
  echo "  Stopping machine: $machine"
  flyctl machines stop "$machine" --app "$APP_NAME" || echo "  (already stopped)"
done
echo -e "${GREEN}✓ Machines stopped${NC}\n"

# Step 3: Apply pending migrations (non-destructive)
if [ "$SKIP_MIGRATIONS" = false ]; then
  echo -e "${YELLOW}Step 3: Applying pending migrations to Neon (no wipe)...${NC}"
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  NEON_SCRIPT="$SCRIPT_DIR/neon-migrate.sh"

  if [ ! -f "$NEON_SCRIPT" ]; then
    echo -e "${RED}✗ neon-migrate.sh not found at $NEON_SCRIPT${NC}"
    exit 1
  fi

  if [ -z "$NEON_DATABASE_URL" ]; then
    echo -e "${RED}✗ NEON_DATABASE_URL is not set. Export it before running.${NC}"
    exit 1
  fi

  "$NEON_SCRIPT" apply
  echo -e "${GREEN}✓ Migrations applied${NC}\n"
else
  echo -e "${YELLOW}Step 3: Skipping migrations${NC}\n"
fi

# Step 4: Start machines
echo -e "${YELLOW}Step 4: Starting Fly machines...${NC}"
for machine in "${MACHINES[@]}"; do
  echo "  Starting machine: $machine"
  flyctl machines start "$machine" --app "$APP_NAME"
done
echo -e "${GREEN}✓ Machines starting${NC}\n"

# Step 5: Wait for startup
echo -e "${YELLOW}Step 5: Waiting for service to boot...${NC}"
echo "Waiting 30 seconds for startup..."
sleep 30
echo -e "${GREEN}✓ Wait complete${NC}\n"

# Step 6: Check logs
echo -e "${YELLOW}Step 6: Checking deployment logs...${NC}"
flyctl logs --app "$APP_NAME" --no-tail 2>&1 | tail -30
echo ""

# Step 7: Test health endpoint
echo -e "${YELLOW}Step 7: Testing health endpoint...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://api.ecent.online/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ API is healthy (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ API health check failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Step 8: Schema verification query
echo -e "${YELLOW}Step 8: Schema verification query ready${NC}"
echo "Run this query in Neon SQL Editor to verify constraints:"
echo ""
echo -e "${BLUE}SELECT constraint_name, table_name, constraint_type"
echo "FROM information_schema.table_constraints"
echo "WHERE table_schema = 'public' AND constraint_type IN ('UNIQUE', 'PRIMARY KEY')"
echo -e "ORDER BY table_name, constraint_type;${NC}"
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify constraints exist in Neon (query above)"
echo "  2. Test OAuth login at https://ignition.ecent.online"
echo "  3. Check logs: flyctl logs --app $APP_NAME"
