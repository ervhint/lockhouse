-- U4: add someone to a house (AC-4.3, AC-4.6, D-07). The server checks their card against the chain first.
-- Returns 'added', 'here' (already in this house), 'taken' (their house has others) or 'unknown' (never signed in).
-- U5 adds: a house that holds papers is 'taken' too.
create function public.add_member(p_house uuid, p_address text, p_by text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  old uuid;
begin
  select house_id into old from public.house_members where address = p_address for update;
  if old is null then return 'unknown'; end if;
  if old = p_house then return 'here'; end if;
  if exists (select 1 from public.house_members where house_id = old and address <> p_address) then return 'taken'; end if;
  update public.house_members set house_id = p_house, added_by = p_by, added_at = now() where address = p_address;
  delete from public.houses where id = old; -- their old house is empty now
  return 'added';
end;
$$;
revoke execute on function public.add_member(uuid, text, text) from public, anon, authenticated;
grant execute on function public.add_member(uuid, text, text) to service_role;

-- add_member removes the empty house; the tests remove the people and houses they make.
grant delete on public.people, public.houses, public.house_members to service_role;
