# Kids AI MVP Plan

## 1. Goal
Build an AI-first Grade 4 Math learning product that is:
- Curriculum-aligned to KICD/CBC.
- Engaging enough for repeat child usage.
- Transparent for parents through clear progress reporting.

## 2. MVP Scope (Funding Demo)
- Student mode with mission-style Grade 4 Math practice.
- AI-generated questions (fresh each session) with 3-level hint ladder.
- Adaptive difficulty by topic mastery and hint usage.
- Parent mode with topic mastery, trend chart, and next-step recommendations.
- KICD topic tags visible in student and parent screens.

## 3. Non-Goals (For MVP)
- Multi-subject support (Math only first).
- Full school/teacher admin portal.
- Native mobile app.
- Real-time multiplayer or social features.

## 4. Architecture
- Frontend: Next.js + TypeScript + Tailwind + Framer Motion.
- Backend/API: Next.js route handlers + server actions.
- App codebase: `apps/web`.
- Database: Self-hosted PostgreSQL in Docker (schema in `db/schema.sql`).
- Infra bootstrap: Docker compose config in `infra/postgres/docker-compose.yml`.
- ORM mapping: Prisma schema in `apps/web/prisma/schema.prisma`.
- API contracts: `docs/API_CONTRACTS.md`.
- Auth: App-managed auth (Auth.js or custom JWT session strategy) mapped into `app_users`.
- AI: OpenAI JSON-mode outputs with validation and retry.
- Analytics: PostHog (engagement and learning funnels).

## 5. Data and AI Flow
1. Child starts session with chosen mission/topic.
2. Backend selects eligible KICD topic + target difficulty.
3. AI generates question package (`question`, `answer`, `hints`, `explanation`).
4. Validator checks format, grade appropriateness, and answer integrity.
5. Child attempts question; attempt is saved.
6. Mastery snapshot updates by topic.
7. Parent dashboard reads latest mastery and daily trends.

## 6. Two-Week Delivery Plan
### Week 1
1. Day 1: Repo/project bootstrap and environment setup.
2. Day 2: KICD Grade 4 Math topic map ingestion.
3. Day 3: DB migration + seed scripts for core topics.
4. Day 4: AI question generator + schema validation pipeline.
5. Day 5: Student mission UI wired to live generation API.

### Week 2
1. Day 6: Hint ladder behavior + adaptive progression logic.
2. Day 7: Attempt logging + mastery scoring jobs.
3. Day 8: Parent dashboard (topic mastery + trend graph + recommendations).
4. Day 9: QA with lecturer's children + instrumentation review.
5. Day 10: polish, demo script, and investor-ready walkthrough.

## 7. Success Metrics for Pilot
- Child completes at least 8 questions/session average.
- Session completion rate above 70%.
- Repeat usage within 3 days above 40%.
- Parent can identify top weak topic in <20 seconds.

## 8. Demo Script (Mastercard Unlock)
1. Start as child in Grade 4 Math mission.
2. Show unique AI-generated question with KICD tag.
3. Intentionally answer wrong and trigger progressive hints.
4. Show adaptive next question.
5. Switch to parent mode and show weak-topic insight + recommendation.
