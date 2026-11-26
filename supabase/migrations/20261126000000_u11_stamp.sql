-- U11: a paper's stamp on QoreChain (AC-11.3, INV-6). The hash of the transaction that carries its fingerprint;
-- null = not stamped (papers put in before U11, the drill's fake drop-in). Only stored after it checks out on chain.
alter table public.items
  add column stamp text check (stamp ~ '^[0-9A-F]{64}$');
