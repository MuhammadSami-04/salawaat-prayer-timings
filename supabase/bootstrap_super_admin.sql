-- =====================================================================
-- bootstrap_super_admin.sql — run ONCE, by hand
-- =====================================================================
-- There is a deliberate chicken-and-egg: only a Super Admin can create
-- authority accounts, so the very first Super Admin is promoted here.
--
-- STEP 1  In the Supabase dashboard go to Authentication → Users →
--         "Add user", create the account, and tick "Auto Confirm User".
--
-- STEP 2  Put that email below and run this file in the SQL Editor.
--
-- STEP 3  Sign in to the app at /login. You will land on /admin and can
--         create every other account from the UI.
-- =====================================================================

update public.profiles
   set role      = 'super_admin',
       active    = true,
       full_name = coalesce(nullif(full_name, ''), 'System Administrator')
 where email = 'admin@university.edu';   -- <<< CHANGE THIS

-- Confirm it worked — this must return exactly one row.
select id, email, full_name, role, active
  from public.profiles
 where role = 'super_admin';
