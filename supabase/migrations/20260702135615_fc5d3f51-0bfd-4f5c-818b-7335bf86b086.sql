
-- Employee ID sequence + column
CREATE SEQUENCE IF NOT EXISTS public.employee_code_seq START 1;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_code TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_employee_code_unique
  ON public.profiles (employee_code) WHERE employee_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_employee_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.employee_code IS NULL THEN
    NEW.employee_code := 'S' || LPAD(nextval('public.employee_code_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_employee_code ON public.profiles;
CREATE TRIGGER profiles_assign_employee_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_employee_code();

-- Backfill any existing profiles with no code, in creation order.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE employee_code IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.profiles
      SET employee_code = 'S' || LPAD(nextval('public.employee_code_seq')::text, 3, '0')
      WHERE id = r.id;
  END LOOP;
END $$;
