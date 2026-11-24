-- This project doesn't give new tables to the API roles by default, so the server's role (service_role) gets
-- exactly what U3 uses. anon and authenticated still get nothing.
grant select, insert, update on public.people, public.houses, public.house_members, public.used_nonces to service_role;
