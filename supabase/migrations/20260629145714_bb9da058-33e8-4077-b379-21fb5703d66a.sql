
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('manager', 'shift_lead', 'staff');

-- ============================================================
-- POSITIONS (reference table)
-- ============================================================
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL CHECK (department IN ('front_of_house', 'back_of_house')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.positions TO authenticated;
GRANT ALL ON public.positions TO service_role;

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view positions"
  ON public.positions FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.positions (name, department, sort_order) VALUES
  ('Server',     'front_of_house', 10),
  ('Host',       'front_of_house', 20),
  ('Bartender',  'front_of_house', 30),
  ('Runner',     'front_of_house', 40),
  ('Head Chef',  'back_of_house',  10),
  ('Line Cook',  'back_of_house',  20),
  ('Prep Cook',  'back_of_house',  30),
  ('Dishwasher', 'back_of_house',  40);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  primary_position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- has_role SECURITY DEFINER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================
-- has_any_manager helper (for bootstrap check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.any_manager_exists()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'manager')
$$;

GRANT EXECUTE ON FUNCTION public.any_manager_exists() TO anon, authenticated;

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- handle_new_user trigger:
-- Auto-create profile + role from auth signup metadata.
-- Expected metadata keys: full_name, phone, primary_position_id, role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_full_name TEXT;
  meta_phone TEXT;
  meta_position_id UUID;
  meta_role TEXT;
BEGIN
  meta_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  meta_phone := NEW.raw_user_meta_data->>'phone';
  meta_position_id := NULLIF(NEW.raw_user_meta_data->>'primary_position_id', '')::UUID;
  meta_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (id, full_name, phone, primary_position_id)
  VALUES (NEW.id, meta_full_name, meta_phone, meta_position_id)
  ON CONFLICT (id) DO NOTHING;

  IF meta_role IN ('manager', 'shift_lead', 'staff') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, meta_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
