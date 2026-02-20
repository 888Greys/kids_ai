#!/usr/bin/env bash
set -euo pipefail

# One-command VPS deploy for Kids AI (Ubuntu, root user)
# Usage:
#   chmod +x scripts/deploy_vps.sh
#   CEREBRAS_API_KEY='your_key' EMAIL='you@example.com' ./scripts/deploy_vps.sh
#
# Optional env vars:
#   DOMAIN, EMAIL, PROJECT_DIR, REPO_URL, BRANCH, APP_PORT, POSTGRES_PORT,
#   AI_PROVIDER, CEREBRAS_API_KEY, OPENAI_API_KEY

DOMAIN="${DOMAIN:-kidsai.samaritansystem.ke}"
EMAIL="${EMAIL:-admin@samaritansystem.ke}"
PROJECT_DIR="${PROJECT_DIR:-/root/kids_ai}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"

APP_SERVICE="kidsai-web"
NGINX_SITE="kidsai"
DB_CONTAINER="kidsai-postgres"
DB_NAME="kids_ai"
DB_USER="kids_ai_user"

AI_PROVIDER="${AI_PROVIDER:-cerebras}"
CEREBRAS_API_KEY="${CEREBRAS_API_KEY:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"

log() {
  printf "\n[deploy] %s\n" "$*"
}

fail() {
  printf "\n[deploy][error] %s\n" "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Run as root. Example: sudo -i && ./scripts/deploy_vps.sh"
  fi
}

pick_free_port() {
  local candidate="$1"
  while ss -ltn | awk '{print $4}' | grep -qE ":${candidate}$"; do
    candidate="$((candidate + 1))"
  done
  printf "%s" "$candidate"
}

install_system_packages() {
  log "Installing required packages"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y \
    ca-certificates \
    certbot \
    curl \
    docker.io \
    git \
    gnupg \
    nginx \
    openssl \
    python3-certbot-nginx \
    unzip

  if apt-cache show docker-compose-plugin >/dev/null 2>&1; then
    apt-get install -y docker-compose-plugin
  else
    apt-get install -y docker-compose
  fi

  systemctl enable --now docker
  systemctl enable --now nginx
}

dc() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  fail "Neither 'docker compose' nor 'docker-compose' is available"
}

install_bun_if_missing() {
  if command -v bun >/dev/null 2>&1; then
    return
  fi

  log "Installing Bun"
  curl -fsSL https://bun.sh/install | bash
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

  fail "Bun binary not found after installation"
}

sync_project() {
  if [[ ! -d "${PROJECT_DIR}" ]]; then
    [[ -n "${REPO_URL}" ]] || fail "PROJECT_DIR missing and REPO_URL is empty"
    log "Cloning repository into ${PROJECT_DIR}"
    git clone --branch "${BRANCH}" "${REPO_URL}" "${PROJECT_DIR}"
    return
  fi

  if [[ -d "${PROJECT_DIR}/.git" ]]; then
    log "Updating repository at ${PROJECT_DIR}"
    git -C "${PROJECT_DIR}" fetch --all --prune
    git -C "${PROJECT_DIR}" checkout "${BRANCH}"
    git -C "${PROJECT_DIR}" pull --ff-only origin "${BRANCH}"
  else
    log "Using existing directory ${PROJECT_DIR} (not a git repo)"
  fi
}

write_state_and_ports() {
  DEPLOY_DIR="${PROJECT_DIR}/deploy/vps"
  mkdir -p "${DEPLOY_DIR}"
  STATE_FILE="${DEPLOY_DIR}/.deploy.env"

  if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${STATE_FILE}"
    APP_PORT="${APP_PORT:-${APP_PORT_SAVED:-}}"
    POSTGRES_PORT="${POSTGRES_PORT:-${POSTGRES_PORT_SAVED:-}}"
    DB_PASSWORD="${DB_PASSWORD:-${DB_PASSWORD_SAVED:-}}"
  fi

  APP_PORT="${APP_PORT:-4120}"
  POSTGRES_PORT="${POSTGRES_PORT:-55433}"

  APP_PORT="$(pick_free_port "${APP_PORT}")"
  POSTGRES_PORT="$(pick_free_port "${POSTGRES_PORT}")"

  if [[ -z "${DB_PASSWORD:-}" ]]; then
    DB_PASSWORD="$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9' | head -c 24)"
  fi

  cat >"${STATE_FILE}" <<EOF
APP_PORT_SAVED=${APP_PORT}
POSTGRES_PORT_SAVED=${POSTGRES_PORT}
DB_PASSWORD_SAVED=${DB_PASSWORD}
EOF

  COMPOSE_FILE="${DEPLOY_DIR}/postgres.compose.yml"
  ENV_FILE="${PROJECT_DIR}/apps/web/.env.production"
}

write_postgres_compose() {
  cat >"${COMPOSE_FILE}" <<EOF
services:
  db:
    image: postgres:16
    container_name: ${DB_CONTAINER}
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      TZ: Africa/Nairobi
      PGTZ: Africa/Nairobi
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - kidsai_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 12

volumes:
  kidsai_postgres_data:
EOF
}

start_postgres() {
  log "Starting Postgres container on host port ${POSTGRES_PORT}"
  dc -f "${COMPOSE_FILE}" up -d

  log "Waiting for Postgres readiness"
  local ready="false"
  for _ in $(seq 1 60); do
    if docker exec "${DB_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
      ready="true"
      break
    fi
    sleep 2
  done

  [[ "${ready}" == "true" ]] || fail "Postgres did not become ready"
}

init_db_if_needed() {
  log "Checking if database schema is initialized"

  local exists
  exists="$(docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAc "select to_regclass('public.app_users') is not null;")"

  if [[ "${exists}" != "t" ]]; then
    log "Applying initial schema"
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${PROJECT_DIR}/db/schema.sql"
  else
    log "Schema already exists, skipping schema.sql"
  fi

  log "Applying curriculum seed"
  docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${PROJECT_DIR}/db/seeds/grade4_kicd_math_topics.sql"
}

write_app_env() {
  local ai_provider="${AI_PROVIDER}"
  if [[ -z "${CEREBRAS_API_KEY}" && "${AI_PROVIDER}" == "cerebras" ]]; then
    ai_provider=""
  fi

  cat >"${ENV_FILE}" <<EOF
NODE_ENV=production

POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASSWORD}

DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${DB_NAME}?schema=public

AI_PROVIDER=${ai_provider}
AI_TIMEOUT_MS=10000
AI_ENABLE_IN_DEV=false
AI_ENABLE_IN_TEST=false

CEREBRAS_API_KEY=${CEREBRAS_API_KEY}
CEREBRAS_MODEL=gpt-oss-120b
CEREBRAS_ENABLE_IN_DEV=false
CEREBRAS_TIMEOUT_MS=10000

OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=gpt-5-mini
OPENAI_ENABLE_IN_DEV=false
OPENAI_TIMEOUT_MS=10000
EOF
}

build_app() {
  local bun_bin="$1"
  log "Installing app dependencies and building Next.js app"
  pushd "${PROJECT_DIR}/apps/web" >/dev/null
  "${bun_bin}" install
  "${bun_bin}" run prisma:generate
  "${bun_bin}" run build
  popd >/dev/null
}

write_systemd_service() {
  local bun_bin="$1"

  cat >/etc/systemd/system/${APP_SERVICE}.service <<EOF
[Unit]
Description=Kids AI Next.js App
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=${PROJECT_DIR}/apps/web
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
EnvironmentFile=${ENV_FILE}
ExecStart=${bun_bin} run start
Restart=always
RestartSec=5
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now "${APP_SERVICE}"
  systemctl restart "${APP_SERVICE}"
}

write_nginx_config() {
  cat >/etc/nginx/sites-available/${NGINX_SITE} <<EOF
server {
  listen 80;
  server_name ${DOMAIN};

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:${APP_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300;
  }
}
EOF

  ln -sf /etc/nginx/sites-available/${NGINX_SITE} /etc/nginx/sites-enabled/${NGINX_SITE}
  rm -f /etc/nginx/sites-enabled/default

  nginx -t
  systemctl reload nginx
}

enable_https_if_possible() {
  if [[ -z "${EMAIL}" ]]; then
    log "EMAIL empty; skipping certbot HTTPS step"
    return
  fi

  log "Attempting HTTPS certificate for ${DOMAIN}"
  if certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect; then
    log "HTTPS enabled successfully"
  else
    log "Certbot failed. App is still available on HTTP. Check DNS for ${DOMAIN} and rerun script."
  fi
}

print_summary() {
  log "Deployment complete"
  cat <<EOF

Domain:          http://${DOMAIN}
App service:     ${APP_SERVICE}
App port:        ${APP_PORT}
Postgres port:   ${POSTGRES_PORT}
Project dir:     ${PROJECT_DIR}

Useful commands:
  systemctl status ${APP_SERVICE}
  journalctl -u ${APP_SERVICE} -f
  docker ps
  docker logs ${DB_CONTAINER}

EOF
}

main() {
  require_root
  install_system_packages
  install_bun_if_missing
  local bun_bin
  bun_bin="$(resolve_bun_bin)"

  sync_project

  [[ -d "${PROJECT_DIR}/apps/web" ]] || fail "apps/web not found in ${PROJECT_DIR}"
  [[ -f "${PROJECT_DIR}/db/schema.sql" ]] || fail "db/schema.sql not found in ${PROJECT_DIR}"

  write_state_and_ports
  write_postgres_compose
  start_postgres
  init_db_if_needed
  write_app_env
  build_app "${bun_bin}"
  write_systemd_service "${bun_bin}"
  write_nginx_config
  enable_https_if_possible
  print_summary
}

main "$@"
