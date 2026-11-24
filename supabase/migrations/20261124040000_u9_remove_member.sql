-- U9: remove someone from a house (AC-9.1). Any member can remove another member, not themselves.
-- They get an empty house of their own, like a first sign-in. Their papers stay in the old house.
-- Returns 'removed', 'self' or 'absent' (not in this house).
create function public.remove_member(p_house uuid, p_address text, p_by text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  home uuid;
begin
  if p_address = p_by then return 'self'; end if;
  perform 1 from public.house_members where address = p_address and house_id = p_house for update;
  if not found then return 'absent'; end if;
  insert into public.houses (owner) values (p_address) returning id into home;
  update public.house_members set house_id = home, added_by = p_address, added_at = now() where address = p_address;
  return 'removed';
end;
$$;
revoke execute on function public.remove_member(uuid, text, text) from public, anon, authenticated;
grant execute on function public.remove_member(uuid, text, text) to service_role;
