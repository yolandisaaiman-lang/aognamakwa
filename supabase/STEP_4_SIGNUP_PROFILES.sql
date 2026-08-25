create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, area)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'youth')::public.ministry_role,
    nullif(new.raw_user_meta_data->>'area', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    area = excluded.area;

  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_signup on auth.users;

create trigger create_profile_after_auth_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
