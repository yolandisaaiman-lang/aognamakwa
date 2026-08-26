-- NAMAKWA AOG CONNECT — SUPABASE DATABASE SETUP
-- Paste this entire file into Supabase Dashboard > SQL Editor > New query, then click Run.
-- Authentication passwords are securely managed by Supabase Auth and are never stored here.

create extension if not exists pgcrypto;

-- Run this once in a new Supabase project. (PostgreSQL does not support
-- CREATE TYPE IF NOT EXISTS.)
create type public.ministry_role as enum (
  'church_administrator', 'pastoral_leader', 'area_leader', 'youth',
  'transport', 'usher_leader', 'media_sound', 'hospital_ministry'
);

-- Every signed-in person receives one role and, where appropriate, one assigned area.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.ministry_role not null,
  area text check (area in ('Nababeep', 'Concordia', 'Okiep', 'Springbok', 'Aggeneys')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A flexible report record covers each ministry's weekly activity.
-- Ministry-specific facts can be stored in details, e.g. taxis_booked, fuel_cost,
-- bible_study_topic, usher_duties, visit_count, set_list, or equipment_notes.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  ministry_role public.ministry_role not null,
  area text check (area in ('Nababeep', 'Concordia', 'Okiep', 'Springbok', 'Aggeneys')),
  title text not null check (char_length(title) between 2 and 150),
  service_date date not null default current_date,
  attendance integer check (attendance is null or attendance >= 0),
  amount numeric(12,2) check (amount is null or amount >= 0),
  details jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_created_by_idx on public.reports(created_by);
create index if not exists reports_role_area_date_idx on public.reports(ministry_role, area, service_date desc);

-- Automatically maintain updated_at.
create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at before update on public.reports for each row execute function public.set_updated_at();

-- Helpers used by the security policies below.
create or replace function public.my_role()
returns public.ministry_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.my_area()
returns text language sql stable security definer set search_path = public as $$
  select area from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_assembly_leader()
returns boolean language sql stable security definer set search_path = public as $$
  select public.my_role() in ('church_administrator', 'pastoral_leader');
$$;

alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- Clear policies first, so this script can safely be re-run.
drop policy if exists "profile owner or assembly leader can view" on public.profiles;
drop policy if exists "assembly leaders manage profiles" on public.profiles;
drop policy if exists "assembly leaders read all reports" on public.reports;
drop policy if exists "area leaders read reports in their area" on public.reports;
drop policy if exists "users read their own reports" on public.reports;
drop policy if exists "users create reports for their own ministry" on public.reports;
drop policy if exists "users update their own reports" on public.reports;
drop policy if exists "assembly leaders can update reports" on public.reports;

-- Profiles: users see themselves; Church Administrators and Pastoral Leaders see all.
create policy "profile owner or assembly leader can view" on public.profiles
  for select using (id = auth.uid() or public.is_assembly_leader());
create policy "assembly leaders manage profiles" on public.profiles
  for all using (public.is_assembly_leader()) with check (public.is_assembly_leader());

-- Reports: administrators and pastors see everything.
create policy "assembly leaders read all reports" on public.reports
  for select using (public.is_assembly_leader());
-- Area Leaders can read all reports for their assigned area.
create policy "area leaders read reports in their area" on public.reports
  for select using (public.my_role() = 'area_leader' and area = public.my_area());
-- Other teams can read only what they have submitted.
create policy "users read their own reports" on public.reports
  for select using (created_by = auth.uid());
-- No one can create a report in another ministry's name.
create policy "users create reports for their own ministry" on public.reports
  for insert with check (
    created_by = auth.uid()
    and ministry_role = public.my_role()
    and (public.is_assembly_leader() or area is null or area = public.my_area())
  );
create policy "users update their own reports" on public.reports
  for update using (created_by = auth.uid()) with check (created_by = auth.uid() and ministry_role = public.my_role());
create policy "assembly leaders can update reports" on public.reports
  for update using (public.is_assembly_leader()) with check (public.is_assembly_leader());

-- Optional: this protects the tables from direct anonymous access.
revoke all on public.profiles, public.reports from anon;
grant select, insert, update on public.profiles, public.reports to authenticated;

-- NEXT: In Supabase Dashboard go to Authentication > Users and create a user.
-- Then get their UUID and run one profile insert per person, for example:
-- insert into public.profiles (id, full_name, role, area) values
-- ('PASTE_AUTH_USER_UUID_HERE', 'Jane Doe', 'church_administrator', 'Nababeep');
--
-- Valid roles:
-- church_administrator | pastoral_leader | area_leader | youth | transport |
-- usher_leader | finance | worship_team | media_sound | hospital_ministry
