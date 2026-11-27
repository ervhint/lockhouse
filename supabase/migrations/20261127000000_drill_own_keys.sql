-- The Q-Day Drill now makes its own pretend family's keys in the browser (D-19), so members no longer give
-- their old keys and the server holds no secret key at all. Drops the U7 table.
drop table public.drill_keys;
