-- NAMAKWA AOG CONNECT — SUPABASE COMPLETE DATABASE SETUP
-- Copy EVERYTHING in this file and paste into Supabase Dashboard > SQL Editor > New query, then click Run.

-- 1. Create Ministry Role Enum (ignore error if already exists)
do $$ begin
  create type public.ministry_role as enum ('church_administrator', 'pastoral_leader', 'area_leader', 'youth', 'transport', 'usher_leader', 'media_sound', 'hospital_ministry');
exception
  when duplicate_object then null;
end $$;

-- 2. Create Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.ministry_role not null,
  area text check (area in ('Nababeep', 'Concordia', 'Okiep', 'Springbok', 'Aggeneys')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create Reports Table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  ministry_role public.ministry_role not null,
  area text check (area in ('Nababeep', 'Concordia', 'Okiep', 'Springbok', 'Aggeneys')),
  title text not null,
  service_date date not null default current_date,
  attendance integer check (attendance >= 0),
  amount numeric(12,2) check (amount >= 0),
  details jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- 5. Helper Function: Is Assembly Leader
create or replace function public.is_assembly_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('church_administrator', 'pastoral_leader')
  );
$$;

-- 6. Automatic Trigger: Create Profile when User Registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, area)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.ministry_role, 'church_administrator'::public.ministry_role),
    new.raw_user_meta_data->>'area'
  )
  on conflict (id) do update set
    role = excluded.role,
    area = excluded.area,
    full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. Reset Policies for Profiles
drop policy if exists "users see own profile" on public.profiles;
drop policy if exists "profile owner or assembly leader can view" on public.profiles;
drop policy if exists "assembly leaders manage profiles" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "users view profiles" on public.profiles
for select using (id = auth.uid() or public.is_assembly_leader());

create policy "users insert own profile" on public.profiles
for insert with check (id = auth.uid() or public.is_assembly_leader());

create policy "users update own profile" on public.profiles
for update using (id = auth.uid() or public.is_assembly_leader());

-- 8. Reset Policies for Reports
drop policy if exists "assembly leaders see all reports" on public.reports;
drop policy if exists "users see own reports" on public.reports;
drop policy if exists "area leaders see area reports" on public.reports;
drop policy if exists "users create own ministry reports" on public.reports;
drop policy if exists "users update own reports" on public.reports;
drop policy if exists "assembly leaders update all reports" on public.reports;

-- View Reports Policy: Leaders see all; Users see their own or reports matching their area
create policy "select reports" on public.reports
for select using (
  public.is_assembly_leader()
  or created_by = auth.uid()
  or (area is not null and area = (select area from public.profiles where id = auth.uid()))
);

-- Insert Reports Policy: Any authenticated user can create reports for themselves or their role
create policy "insert reports" on public.reports
for insert with check (
  created_by = auth.uid()
  and (
    ministry_role = coalesce((select role from public.profiles where id = auth.uid()), (auth.jwt() -> 'user_metadata' ->> 'role')::public.ministry_role)
    or public.is_assembly_leader()
    or ministry_role = 'area_leader'
  )
);

-- Update Reports Policy
create policy "update reports" on public.reports
for update using (created_by = auth.uid() or public.is_assembly_leader());

-- Delete Reports Policy
create policy "delete reports" on public.reports
for delete using (created_by = auth.uid() or public.is_assembly_leader());
