alter table public.goals
add column if not exists target_body_fat_percentage numeric(5, 2) check (
  target_body_fat_percentage is null
  or target_body_fat_percentage between 0 and 100
);
