create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.ministry_role not null,
  area text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id),
  ministry_role public.ministry_role not null,
  area text,
  title text not null,
  service_date date not null default current_date,
  attendance integer,
  amount numeric(12,2),
  details jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
