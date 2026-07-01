
DO $$ BEGIN
  CREATE TYPE public.staff_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.staff_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS secondary_position_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_hours_per_week INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_max_hours_range;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_max_hours_range
  CHECK (max_hours_per_week IS NULL OR (max_hours_per_week >= 0 AND max_hours_per_week <= 168));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles ((NULLIF(regexp_replace(phone, '\D', '', 'g'), '')))
  WHERE phone IS NOT NULL AND length(regexp_replace(phone, '\D', '', 'g')) > 0;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
