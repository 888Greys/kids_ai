# Postgres Docker Setup (Do Not Auto-Run)

These files prepare a self-hosted PostgreSQL instance for this project:
- `infra/postgres/docker-compose.yml`
- `apps/web/.env.example`

## What is preconfigured
- PostgreSQL 16 container.
- Database: `kids_ai`.
- User: `kids_ai_user`.
- Persistent volume: `postgres_data`.

## Manual start commands (when you are ready)
```bash
cd infra/postgres
docker compose up -d
```

## Manual stop commands
```bash
cd infra/postgres
docker compose down
```

## Apply schema after DB is running
```bash
psql postgresql://kids_ai_user:change_me@localhost:5432/kids_ai -f db/schema.sql
```

## Load Grade 4 KICD seed topics
```bash
psql postgresql://kids_ai_user:change_me@localhost:5432/kids_ai -f db/seeds/grade4_kicd_math_topics.sql
```

## Notes
- Change `POSTGRES_PASSWORD` before production use.
- Replace localhost values if your app server is on a different host/network.
