#!/usr/bin/env bash
set -euo pipefail

# Fast Update Script for Kids AI (Ubuntu, root user)
# This script pulls the latest code, pushes the database schema, builds the app, and restarts the service.
# It skips installing system dependencies and setting up Nginx/SSL.

DOMAIN="${DOMAIN:-kidsai.samaritansystem.ke}"
PROJECT_DIR="${PROJECT_DIR:-/root/kids_ai}"
BRANCH="${BRANCH:-main}"
APP_SERVICE="kidsai-web"

log() {
  printf "\n[update] %s\n" "$*"
}

fail() {
  printf "\n[update][error] %s\n" "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Run as root. Example: sudo -i && ./scripts/update_vps.sh"
  fi
}

resolve_bun_bin() {
  if command -v bun >/dev/null 2>&1; then
    command -v bun
    return
  fi

  if [[ -x "/root/.bun/bin/bun" ]]; then
    printf "%s" "/root/.bun/bin/bun"
    return
  fi

  fail "Bun binary not found. Please run scripts/deploy_vps.sh first."
}

pull_latest_code() {
  if [[ ! -d "${PROJECT_DIR}/.git" ]]; then
    fail "Project directory ${PROJECT_DIR} is not a git repository. Cannot update."
  fi

  log "Pulling latest code from ${BRANCH} branch"
  git -C "${PROJECT_DIR}" fetch --all --prune
  
  # Discard any local changes (e.g. auto-generated files like next-env.d.ts)
  git -C "${PROJECT_DIR}" reset --hard "origin/${BRANCH}"
  git -C "${PROJECT_DIR}" checkout "${BRANCH}"
}

update_database_schema() {
  local bun_bin="$1"
  log "Pushing latest database schema..."
  
  # Load the production environment variables (which contain DATABASE_URL)
  if [[ -f "${PROJECT_DIR}/apps/web/.env.production" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${PROJECT_DIR}/apps/web/.env.production"
    set +a
  else
    fail ".env.production not found in ${PROJECT_DIR}/apps/web. Cannot push schema."
  fi

  pushd "${PROJECT_DIR}/apps/web" >/dev/null
  "${bun_bin}" x prisma db push --accept-data-loss
  popd >/dev/null
}

rebuild_and_restart() {
  local bun_bin="$1"
  log "Installing new dependencies and rebuilding Next.js app..."
  
  pushd "${PROJECT_DIR}/apps/web" >/dev/null
  "${bun_bin}" install
  "${bun_bin}" run prisma:generate
  "${bun_bin}" run build
  popd >/dev/null

  log "Restarting ${APP_SERVICE} service..."
  systemctl restart "${APP_SERVICE}"
  
  log "Checking service status..."
  if systemctl is-active --quiet "${APP_SERVICE}"; then
    log "Service is running successfully!"
  else
    fail "Service failed to start. Run 'journalctl -u ${APP_SERVICE} -f' to see logs."
  fi
}

main() {
  require_root
  
  local bun_bin
  bun_bin="$(resolve_bun_bin)"

  pull_latest_code
  update_database_schema "${bun_bin}"
  rebuild_and_restart "${bun_bin}"

  log "Update complete! The application at http://${DOMAIN} has been updated."
}

main "$@"
