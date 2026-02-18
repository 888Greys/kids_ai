# Database Schema Notes

Source file: `db/schema.sql`

## Core Entities
- `app_users`: Parent/admin application accounts mapped to Supabase auth users.
- `children`: Child learner profiles under each parent account.
- `curriculum_topics`: KICD/CBC topic catalog for Grade 4 Math (expandable later).
- `learning_sessions`: One learning run with model/version and high-level outcomes.
- `generated_questions`: AI or curated question packages with hints and explanations.
- `question_attempts`: Child submissions, correctness, hint usage, and latency.
- `mastery_snapshots`: Topic-level proficiency snapshots for parent reporting.
- `parent_recommendations`: AI-generated next-step guidance per child.
- `badges` and `child_badges`: Engagement and reward system.

## Parent Dashboard Queries Enabled
- Daily trend line:
  - Use `v_child_daily_progress` for attempts, accuracy, and hint average by date.
- Latest topic mastery:
  - Use `v_child_topic_mastery_latest` for the newest proficiency per topic.
- Weak-topic recommendations:
  - Join latest mastery rows where `proficiency = 'needs_support'` with `parent_recommendations`.

## Adaptivity Signals Stored
- Accuracy by topic and date.
- Hint dependency by topic.
- Response time per attempt.
- Session-level totals (`total_questions`, `correct_answers`, `avg_hints_used`).

## Initial Constraints
- `grade_level` constrained to 1..9.
- `hints_used` constrained to 0..3.
- `hint_ladder` must be a JSON array.
- One mastery row per child/topic/day (`unique (child_id, topic_id, snapshot_date)`).

## Next Migration Tasks
1. Add Row-Level Security policies for parent-child isolation.
2. Add a seed migration for Grade 4 KICD Math topics.
3. Add generated columns/materialized view for faster dashboard reads if needed.
4. Add audit table for AI prompt/response moderation events.

