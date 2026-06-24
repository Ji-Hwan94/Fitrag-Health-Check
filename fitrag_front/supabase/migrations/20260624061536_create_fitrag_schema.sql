-- FitRAG Coach initial schema
-- Apply in Supabase SQL Editor or with `supabase db push`.

create extension if not exists "pgcrypto";
create extension if not exists "vector" with schema extensions;

create type public.goal_type as enum (
  'fat_loss',
  'muscle_gain',
  'weight_gain',
  'body_recomposition',
  'performance'
);

create type public.experience_level as enum (
  'beginner',
  'intermediate',
  'advanced'
);

create type public.evidence_type as enum (
  'workout',
  'meal',
  'nutrition',
  'safety',
  'recovery',
  'general'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.health_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  gender text,
  age integer check (age is null or age between 1 and 120),
  height_cm numeric(5, 2) check (height_cm is null or height_cm > 0),
  weight_kg numeric(5, 2) check (weight_kg is null or weight_kg > 0),
  muscle_mass_kg numeric(5, 2) check (muscle_mass_kg is null or muscle_mass_kg >= 0),
  fat_mass_kg numeric(5, 2) check (fat_mass_kg is null or fat_mass_kg >= 0),
  body_fat_percentage numeric(5, 2) check (
    body_fat_percentage is null
    or body_fat_percentage between 0 and 100
  ),
  bmi numeric(5, 2) check (bmi is null or bmi > 0),
  activity_level text,
  injuries text,
  allergies text,
  dietary_restrictions text,
  food_preferences text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_type public.goal_type not null,
  target_weight_kg numeric(5, 2) check (
    target_weight_kg is null
    or target_weight_kg > 0
  ),
  target_muscle_mass_kg numeric(5, 2) check (
    target_muscle_mass_kg is null
    or target_muscle_mass_kg >= 0
  ),
  target_fat_mass_kg numeric(5, 2) check (
    target_fat_mass_kg is null
    or target_fat_mass_kg >= 0
  ),
  target_date date,
  weekly_workout_days integer check (
    weekly_workout_days is null
    or weekly_workout_days between 1 and 7
  ),
  daily_workout_minutes integer check (
    daily_workout_minutes is null
    or daily_workout_minutes > 0
  ),
  experience_level public.experience_level not null default 'beginner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  week_start_date date not null,
  frequency_per_week integer not null check (frequency_per_week between 1 and 7),
  intensity_level text,
  plan_json jsonb not null default '{}'::jsonb,
  caution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  daily_calories integer check (daily_calories is null or daily_calories > 0),
  protein_g integer check (protein_g is null or protein_g >= 0),
  carbs_g integer check (carbs_g is null or carbs_g >= 0),
  fat_g integer check (fat_g is null or fat_g >= 0),
  meals_json jsonb not null default '[]'::jsonb,
  nutrition_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  name text not null,
  quantity text,
  search_keyword text,
  search_url text,
  estimated_price numeric(12, 2) check (
    estimated_price is null
    or estimated_price >= 0
  ),
  created_at timestamptz not null default now()
);

create table public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  source_url text,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.recommendation_evidence (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid references public.workout_plans(id) on delete cascade,
  meal_plan_id uuid references public.meal_plans(id) on delete cascade,
  rag_document_id uuid not null references public.rag_documents(id) on delete cascade,
  evidence_type public.evidence_type not null default 'general',
  summary text,
  relevance_score numeric(6, 5) check (
    relevance_score is null
    or relevance_score between 0 and 1
  ),
  created_at timestamptz not null default now(),
  constraint recommendation_evidence_plan_required check (
    workout_plan_id is not null
    or meal_plan_id is not null
  )
);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_health_profiles_updated_at
before update on public.health_profiles
for each row execute function public.set_updated_at();

create trigger set_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create trigger set_workout_plans_updated_at
before update on public.workout_plans
for each row execute function public.set_updated_at();

create trigger set_meal_plans_updated_at
before update on public.meal_plans
for each row execute function public.set_updated_at();

create index health_profiles_user_id_idx on public.health_profiles(user_id);
create index goals_user_id_idx on public.goals(user_id);
create index workout_plans_user_id_idx on public.workout_plans(user_id);
create index workout_plans_goal_id_idx on public.workout_plans(goal_id);
create index meal_plans_user_id_idx on public.meal_plans(user_id);
create index meal_plans_goal_id_idx on public.meal_plans(goal_id);
create index shopping_items_meal_plan_id_idx on public.shopping_items(meal_plan_id);
create index rag_documents_source_idx on public.rag_documents(source);
create index rag_documents_metadata_idx on public.rag_documents using gin(metadata);
create index recommendation_evidence_workout_plan_id_idx
  on public.recommendation_evidence(workout_plan_id);
create index recommendation_evidence_meal_plan_id_idx
  on public.recommendation_evidence(meal_plan_id);
create index recommendation_evidence_rag_document_id_idx
  on public.recommendation_evidence(rag_document_id);

create index rag_documents_embedding_idx
  on public.rag_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100)
  where embedding is not null;

alter table public.users enable row level security;
alter table public.health_profiles enable row level security;
alter table public.goals enable row level security;
alter table public.workout_plans enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_items enable row level security;
alter table public.rag_documents enable row level security;
alter table public.recommendation_evidence enable row level security;

create policy "Users can read own user row"
on public.users for select
using (auth.uid() = auth_user_id);

create policy "Users can insert own user row"
on public.users for insert
with check (auth.uid() = auth_user_id);

create policy "Users can update own user row"
on public.users for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "Users can manage own health profile"
on public.health_profiles for all
using (
  exists (
    select 1
    from public.users
    where users.id = health_profiles.user_id
      and users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = health_profiles.user_id
      and users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own goals"
on public.goals for all
using (
  exists (
    select 1
    from public.users
    where users.id = goals.user_id
      and users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = goals.user_id
      and users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own workout plans"
on public.workout_plans for all
using (
  exists (
    select 1
    from public.users
    where users.id = workout_plans.user_id
      and users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = workout_plans.user_id
      and users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own meal plans"
on public.meal_plans for all
using (
  exists (
    select 1
    from public.users
    where users.id = meal_plans.user_id
      and users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = meal_plans.user_id
      and users.auth_user_id = auth.uid()
  )
);

create policy "Users can manage own shopping items"
on public.shopping_items for all
using (
  exists (
    select 1
    from public.meal_plans
    join public.users on users.id = meal_plans.user_id
    where meal_plans.id = shopping_items.meal_plan_id
      and users.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.meal_plans
    join public.users on users.id = meal_plans.user_id
    where meal_plans.id = shopping_items.meal_plan_id
      and users.auth_user_id = auth.uid()
  )
);

create policy "Authenticated users can read RAG documents"
on public.rag_documents for select
to authenticated
using (true);

create policy "Authenticated users can read recommendation evidence"
on public.recommendation_evidence for select
to authenticated
using (true);

-- Inserts/updates for rag_documents and recommendation_evidence should be done
-- with a service role key or through trusted backend endpoints.
