-- U10: the house's recovery key (AC-10.1). Its own 24 secret words, kept on paper; the words never reach us.
-- houses.recovery: its public half and who made it, signed by them ({ mlkem, x25519, by, signature }).
-- houses.recovery_lookup / items.recovery: a hash only the words give; the words alone find their papers.
alter table public.houses
  add column recovery jsonb,
  add column recovery_lookup text unique check (recovery_lookup ~ '^[0-9a-f]{64}$');
alter table public.items
  add column recovery text check (recovery ~ '^[0-9a-f]{64}$'); -- set when the recovery key is one of its readers
create index items_recovery_idx on public.items (recovery) where recovery is not null;

-- U9 again, plus one line: removing the member who made the recovery key also drops the key, since they
-- saw its words. The house can make a new one. Papers already locked to the old key still open with its words.
create or replace function public.remove_member(p_house uuid, p_address text, p_by text)
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
  update public.houses set recovery = null, recovery_lookup = null where id = p_house and recovery->>'by' = p_address;
  return 'removed';
end;
$$;
revoke execute on function public.remove_member(uuid, text, text) from public, anon, authenticated;
grant execute on function public.remove_member(uuid, text, text) to service_role;
