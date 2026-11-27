-- U12 Change Readers (AC-12.5, D-22): when a paper's readers last changed; null = never.
-- The route replaces the locked copy in place, so the server may update only what a change replaces:
-- never the id, house, sender, title or put-in date.
alter table public.items add column changed_at timestamptz;
grant update (envelope, signature, readers, size, recovery, stamp, changed_at) on public.items to service_role;
