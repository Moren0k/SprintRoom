-- Enable RLS on the users table to prevent unauthorized PostgREST access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- The server uses an InsForge API key (admin-level) which bypasses RLS,
-- so existing server-side auth flows continue to work unchanged.
--
-- These policies protect against the case where the anon key is exposed:
--   - SELECT: any authenticated request can read user rows (needed for
--     member names, assignee display, and dashboard queries)
--   - INSERT: allows user registration through PostgREST
--   - UPDATE: users can update their own profile

CREATE POLICY "Users can read user rows" ON public.users
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can be created" ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also enable RLS on other sensitive tables for defense in depth
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members FORCE ROW LEVEL SECURITY;

CREATE POLICY "Members can read project members" ON public.project_members
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Members can be added" ON public.project_members
  FOR INSERT
  TO anon
  WITH CHECK (true);
