-- U3: people, houses, house members, used sign-in nonces (PLAN §3.2, D-06, D-07).
-- Only the server touches these, with the service role key. RLS on, no policies: the Data API gives anon nothing.

create table public.people (
  address text primary key check (address ~ '^qor1[02-9ac-hj-np-z]{38,58}$'),
  name text not null check (length(name) between 1 and 80),
  card jsonb not null, -- QoreSeal recipient card, checked against the chain before saving
  created_at timestamptz not null default now()
);

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  owner text not null references public.people (address),
  created_at timestamptz not null default now()
);
create index houses_owner_idx on public.houses (owner);

create table public.house_members (
  address text primary key references public.people (address), -- one house per person (Must)
  house_id uuid not null references public.houses (id),
  added_by text not null references public.people (address),
  added_at timestamptz not null default now()
);
create index house_members_house_id_idx on public.house_members (house_id);
create index house_members_added_by_idx on public.house_members (added_by);

-- A nonce can sign someone in once (AC-3.4). ponytail: never pruned; rows are tiny, add a cleanup if it ever matters.
create table public.used_nonces (
  nonce text primary key,
  used_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.houses enable row level security;
alter table public.house_members enable row level security;
alter table public.used_nonces enable row level security;
revoke all on public.people, public.houses, public.house_members, public.used_nonces from anon, authenticated;

-- One sign-in, all or nothing: use up the nonce (a used one raises unique_violation), save the name and card,
-- and make a house with only this person in it if they have none yet (AC-3.2). Returns the house id.
create function public.sign_in(p_nonce text, p_address text, p_name text, p_card jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  home uuid;
begin
  insert into public.used_nonces (nonce) values (p_nonce);
  insert into public.people (address, name, card) values (p_address, p_name, p_card)
    on conflict (address) do update set name = excluded.name, card = excluded.card;
  select house_id into home from public.house_members where address = p_address;
  if home is null then
    insert into public.houses (owner) values (p_address) returning id into home;
    insert into public.house_members (address, house_id, added_by) values (p_address, home, p_address);
  end if;
  return home;
end;
$$;
revoke execute on function public.sign_in(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.sign_in(text, text, text, jsonb) to service_role;
