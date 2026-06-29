
-- Lock down trigger and helper functions: revoke public execute, keep only what's needed.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.any_manager_exists() FROM PUBLIC;
-- any_manager_exists stays callable by anon (needed for bootstrap check before any user exists)
GRANT EXECUTE ON FUNCTION public.any_manager_exists() TO anon, authenticated, service_role;
