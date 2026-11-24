-- U7: old keys given to the Q-Day Drill (Simulation) (PLAN §3.2, D-11). The only secret key the server ever holds,
-- given on purpose: the X25519 half, which opens the old-lock drill copy and no Lockhouse copy (INV-1).

create table public.drill_keys (
  address text primary key references public.people (address),
  x25519_secret text not null check (length(x25519_secret) = 43), -- 32 bytes, base64url
  old_copy text not null check (old_copy like 'oldlock:%'), -- the drill sample, locked with the old lock to this person
  created_at timestamptz not null default now()
);

alter table public.drill_keys enable row level security;
revoke all on public.drill_keys from anon, authenticated;
grant select, insert, update, delete on public.drill_keys to service_role;
