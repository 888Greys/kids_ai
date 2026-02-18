-- Kids AI MVP database schema (PostgreSQL / Supabase)
-- Focus: Grade 4 Math pilot + parent dashboard insights

create extension if not exists "pgcrypto";

create type user_role as enum ('parent', 'admin');
create type session_mode as enum ('practice', 'challenge', 'revision');
create type difficulty_level as enum ('easy', 'medium', 'hard', 'adaptive');
create type question_source as enum ('ai_generated', 'curated');
create type proficiency_band as enum ('needs_support', 'developing', 'proficient', 'advanced');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  role user_role not null default 'parent',
  full_name text not null,
  email text not null unique,
  timezone text not null default 'Africa/Nairobi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table children (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references app_users(id) on delete cascade,
  first_name text not null,
  last_name text,
  grade_level int not null default 4 check (grade_level between 1 and 9),
  date_of_birth date,
  avatar_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table curriculum_topics (
  id uuid primary key default gen_random_uuid(),
  grade_level int not null,
  strand text not null,
  sub_strand text not null,
  topic_code text not null unique,
  topic_title text not null,
  learning_outcome text not null,
  source_name text not null default 'KICD CBC',
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table learning_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  focus_topic_id uuid references curriculum_topics(id),
  mode session_mode not null default 'practice',
  ai_model text not null,
  prompt_version text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_questions int not null default 0 check (total_questions >= 0),
  correct_answers int not null default 0 check (correct_answers >= 0),
  avg_hints_used numeric(5,2) not null default 0,
  engagement_score numeric(5,2),
  created_at timestamptz not null default now()
);

create table generated_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references learning_sessions(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  topic_id uuid not null references curriculum_topics(id),
  source question_source not null default 'ai_generated',
  difficulty difficulty_level not null default 'adaptive',
  question_text text not null,
  answer_format text not null default 'number',
  correct_answer jsonb not null,
  options jsonb,
  hint_ladder jsonb not null check (jsonb_typeof(hint_ladder) = 'array'),
  explanation text not null,
  prompt_input jsonb,
  model_output jsonb,
  created_at timestamptz not null default now()
);

create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references generated_questions(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  submitted_answer jsonb not null,
  is_correct boolean not null,
  hints_used int not null default 0 check (hints_used between 0 and 3),
  response_time_seconds int check (response_time_seconds is null or response_time_seconds >= 0),
  feedback_text text,
  created_at timestamptz not null default now()
);

create table mastery_snapshots (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  topic_id uuid not null references curriculum_topics(id) on delete cascade,
  snapshot_date date not null default current_date,
  attempts_count int not null default 0,
  accuracy_percent numeric(5,2) not null default 0,
  hint_dependency_percent numeric(5,2) not null default 0,
  mastery_score numeric(5,2) not null default 0,
  proficiency proficiency_band not null default 'developing',
  created_at timestamptz not null default now(),
  unique (child_id, topic_id, snapshot_date)
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  badge_code text not null unique,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table child_badges (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (child_id, badge_id)
);

create table parent_recommendations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  focus_topic_id uuid references curriculum_topics(id),
  generated_on date not null default current_date,
  recommendation text not null,
  created_at timestamptz not null default now()
);

create index idx_children_parent on children(parent_user_id);
create index idx_topics_grade_active on curriculum_topics(grade_level, is_active);
create index idx_sessions_child_started on learning_sessions(child_id, started_at desc);
create index idx_questions_child_topic_created on generated_questions(child_id, topic_id, created_at desc);
create index idx_attempts_child_created on question_attempts(child_id, created_at desc);
create index idx_snapshots_child_date on mastery_snapshots(child_id, snapshot_date desc);

create trigger trg_app_users_updated_at
before update on app_users
for each row execute function set_updated_at();

create trigger trg_children_updated_at
before update on children
for each row execute function set_updated_at();

create or replace view v_child_daily_progress as
select
  qa.child_id,
  date(qa.created_at) as activity_date,
  count(*) as attempts,
  count(*) filter (where qa.is_correct) as correct_attempts,
  round((100.0 * count(*) filter (where qa.is_correct) / nullif(count(*), 0))::numeric, 2) as accuracy_percent,
  round(avg(qa.hints_used)::numeric, 2) as avg_hints_used
from question_attempts qa
group by qa.child_id, date(qa.created_at);

create or replace view v_child_topic_mastery_latest as
select distinct on (ms.child_id, ms.topic_id)
  ms.child_id,
  ms.topic_id,
  ms.snapshot_date,
  ms.attempts_count,
  ms.accuracy_percent,
  ms.hint_dependency_percent,
  ms.mastery_score,
  ms.proficiency
from mastery_snapshots ms
order by ms.child_id, ms.topic_id, ms.snapshot_date desc;

