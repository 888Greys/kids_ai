# Kids AI

Repository layout:

- `apps/web`: Bun + Next.js application code (UI + API routes).
- `apps/web/prisma`: Prisma schema and client generation.
- `db`: SQL schema and seed files for PostgreSQL.
- `infra/postgres`: Docker Compose for local/self-hosted Postgres.
- `docs`: product plan, DB notes, infra setup, API contracts.
- `archive/static-prototype`: original static prototype kept for reference.

## Web App Commands

```bash
cd apps/web
bun install
bun run prisma:generate
bun run dev
```

## Quality Checks

```bash
cd apps/web
bun run lint
bun run typecheck
bun run build
```

## Database Setup

```bash
cd infra/postgres
docker compose up -d
cd ../..
psql postgresql://kids_ai_user:change_me@localhost:5432/kids_ai -f db/schema.sql
psql postgresql://kids_ai_user:change_me@localhost:5432/kids_ai -f db/seeds/grade4_kicd_math_topics.sql
```
