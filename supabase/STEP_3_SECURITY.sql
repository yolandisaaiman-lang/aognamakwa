alter table public.profiles enable row level security;
alter table public.reports enable row level security;

create function public.is_assembly_leader()
returns boolean
language sql
stable
security definer
as $$
select exists (
  select 1 from public.profiles
  where id = auth.uid()
  and role in ('church_administrator', 'pastoral_leader')
);
$$;

create policy "profile_access" on public.profiles
for select using (id = auth.uid() or public.is_assembly_leader());

create policy "leader_profile_management" on public.profiles
for all using (public.is_assembly_leader()) with check (public.is_assembly_leader());

create policy "leader_report_access" on public.reports
for select using (public.is_assembly_leader());

create policy "own_report_access" on public.reports
for select using (created_by = auth.uid());

create policy "own_report_insert" on public.reports
for insert with check (
  created_by = auth.uid()
  and ministry_role = (select role from public.profiles where id = auth.uid())
);

create policy "own_report_update" on public.reports
for update using (created_by = auth.uid()) with check (created_by = auth.uid());
