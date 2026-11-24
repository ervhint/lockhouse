-- U5: papers (items) in a house (PLAN §3.2, D-08, D-09). Only locked copies: the server can't open any of them.
-- The route checks members, the envelope and the signature before it inserts (AC-5.3).

create table public.items (
  id uuid primary key, -- made in the browser; also the envelope's AAD (INV-4)
  house_id uuid not null references public.houses (id),
  sender text not null references public.people (address),
  title text not null check (length(title) between 1 and 80),
  envelope text not null check (envelope like 'qoreseal:%'),
  signature jsonb not null,
  readers text[] not null check (cardinality(readers) >= 1),
  size int not null check (size > 0),
  created_at timestamptz not null default now()
);
create index items_house_id_created_at_idx on public.items (house_id, created_at desc);
create index items_sender_idx on public.items (sender);

alter table public.items enable row level security;
revoke all on public.items from anon, authenticated;
grant select, insert, delete on public.items to service_role;

-- AC-4.6: a house that holds papers is 'taken' too, so its papers never lose their house.
create or replace function public.add_member(p_house uuid, p_address text, p_by text)
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
  if exists (select 1 from public.house_members where house_id = old and address <> p_address)
    or exists (select 1 from public.items where house_id = old) then return 'taken'; end if;
  update public.house_members set house_id = p_house, added_by = p_by, added_at = now() where address = p_address;
  delete from public.houses where id = old; -- their old house is empty now
  return 'added';
end;
$$;
revoke execute on function public.add_member(uuid, text, text) from public, anon, authenticated;
grant execute on function public.add_member(uuid, text, text) to service_role;
