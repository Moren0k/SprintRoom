-- Fix SECURITY DEFINER exposure on is_project_member
ALTER FUNCTION public.is_project_member(uuid, uuid, integer[])
  SECURITY INVOKER;
