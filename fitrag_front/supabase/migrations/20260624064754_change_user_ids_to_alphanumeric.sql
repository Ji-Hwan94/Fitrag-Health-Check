drop policy "Users can manage own health profile" on public.health_profiles;
drop policy "Users can manage own goals" on public.goals;
drop policy "Users can manage own workout plans" on public.workout_plans;
drop policy "Users can manage own meal plans" on public.meal_plans;
drop policy "Users can manage own shopping items" on public.shopping_items;

alter table public.health_profiles drop constraint health_profiles_user_id_fkey;
alter table public.goals drop constraint goals_user_id_fkey;
alter table public.workout_plans drop constraint workout_plans_user_id_fkey;
alter table public.meal_plans drop constraint meal_plans_user_id_fkey;

alter table public.users drop constraint users_pkey;
alter table public.users alter column id drop default;

alter table public.health_profiles
  alter column user_id type text
  using (case user_id
    when '00000000-0000-0000-0000-000000000001'::uuid then 'fitrag01'
    when '00000000-0000-0000-0000-000000000002'::uuid then 'fitrag02'
    when '00000000-0000-0000-0000-000000000003'::uuid then 'fitrag03'
    when '00000000-0000-0000-0000-000000000004'::uuid then 'fitrag04'
    when '00000000-0000-0000-0000-000000000005'::uuid then 'fitrag05'
    when '00000000-0000-0000-0000-000000000006'::uuid then 'fitrag06'
    when '00000000-0000-0000-0000-000000000007'::uuid then 'fitrag07'
    when '00000000-0000-0000-0000-000000000008'::uuid then 'fitrag08'
    when '00000000-0000-0000-0000-000000000009'::uuid then 'fitrag09'
    when '00000000-0000-0000-0000-000000000010'::uuid then 'fitrag10'
    else user_id::text
  end);

alter table public.goals
  alter column user_id type text
  using (case user_id
    when '00000000-0000-0000-0000-000000000001'::uuid then 'fitrag01'
    when '00000000-0000-0000-0000-000000000002'::uuid then 'fitrag02'
    when '00000000-0000-0000-0000-000000000003'::uuid then 'fitrag03'
    when '00000000-0000-0000-0000-000000000004'::uuid then 'fitrag04'
    when '00000000-0000-0000-0000-000000000005'::uuid then 'fitrag05'
    when '00000000-0000-0000-0000-000000000006'::uuid then 'fitrag06'
    when '00000000-0000-0000-0000-000000000007'::uuid then 'fitrag07'
    when '00000000-0000-0000-0000-000000000008'::uuid then 'fitrag08'
    when '00000000-0000-0000-0000-000000000009'::uuid then 'fitrag09'
    when '00000000-0000-0000-0000-000000000010'::uuid then 'fitrag10'
    else user_id::text
  end);

alter table public.workout_plans
  alter column user_id type text
  using (case user_id
    when '00000000-0000-0000-0000-000000000001'::uuid then 'fitrag01'
    when '00000000-0000-0000-0000-000000000002'::uuid then 'fitrag02'
    when '00000000-0000-0000-0000-000000000003'::uuid then 'fitrag03'
    when '00000000-0000-0000-0000-000000000004'::uuid then 'fitrag04'
    when '00000000-0000-0000-0000-000000000005'::uuid then 'fitrag05'
    when '00000000-0000-0000-0000-000000000006'::uuid then 'fitrag06'
    when '00000000-0000-0000-0000-000000000007'::uuid then 'fitrag07'
    when '00000000-0000-0000-0000-000000000008'::uuid then 'fitrag08'
    when '00000000-0000-0000-0000-000000000009'::uuid then 'fitrag09'
    when '00000000-0000-0000-0000-000000000010'::uuid then 'fitrag10'
    else user_id::text
  end);

alter table public.meal_plans
  alter column user_id type text
  using (case user_id
    when '00000000-0000-0000-0000-000000000001'::uuid then 'fitrag01'
    when '00000000-0000-0000-0000-000000000002'::uuid then 'fitrag02'
    when '00000000-0000-0000-0000-000000000003'::uuid then 'fitrag03'
    when '00000000-0000-0000-0000-000000000004'::uuid then 'fitrag04'
    when '00000000-0000-0000-0000-000000000005'::uuid then 'fitrag05'
    when '00000000-0000-0000-0000-000000000006'::uuid then 'fitrag06'
    when '00000000-0000-0000-0000-000000000007'::uuid then 'fitrag07'
    when '00000000-0000-0000-0000-000000000008'::uuid then 'fitrag08'
    when '00000000-0000-0000-0000-000000000009'::uuid then 'fitrag09'
    when '00000000-0000-0000-0000-000000000010'::uuid then 'fitrag10'
    else user_id::text
  end);

alter table public.users
  alter column id type text
  using (case id
    when '00000000-0000-0000-0000-000000000001'::uuid then 'fitrag01'
    when '00000000-0000-0000-0000-000000000002'::uuid then 'fitrag02'
    when '00000000-0000-0000-0000-000000000003'::uuid then 'fitrag03'
    when '00000000-0000-0000-0000-000000000004'::uuid then 'fitrag04'
    when '00000000-0000-0000-0000-000000000005'::uuid then 'fitrag05'
    when '00000000-0000-0000-0000-000000000006'::uuid then 'fitrag06'
    when '00000000-0000-0000-0000-000000000007'::uuid then 'fitrag07'
    when '00000000-0000-0000-0000-000000000008'::uuid then 'fitrag08'
    when '00000000-0000-0000-0000-000000000009'::uuid then 'fitrag09'
    when '00000000-0000-0000-0000-000000000010'::uuid then 'fitrag10'
    else id::text
  end);

alter table public.users
  add constraint users_id_alphanumeric_length_check
  check (id ~ '^[A-Za-z0-9]{8,10}$');

alter table public.health_profiles
  add constraint health_profiles_user_id_alphanumeric_length_check
  check (user_id ~ '^[A-Za-z0-9]{8,10}$');

alter table public.goals
  add constraint goals_user_id_alphanumeric_length_check
  check (user_id ~ '^[A-Za-z0-9]{8,10}$');

alter table public.workout_plans
  add constraint workout_plans_user_id_alphanumeric_length_check
  check (user_id ~ '^[A-Za-z0-9]{8,10}$');

alter table public.meal_plans
  add constraint meal_plans_user_id_alphanumeric_length_check
  check (user_id ~ '^[A-Za-z0-9]{8,10}$');

alter table public.users add constraint users_pkey primary key (id);

alter table public.health_profiles
  add constraint health_profiles_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.goals
  add constraint goals_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.workout_plans
  add constraint workout_plans_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.meal_plans
  add constraint meal_plans_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

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
