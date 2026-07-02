
DO $$ BEGIN
  CREATE TYPE public.schedule_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swap_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- schedule_weeks
CREATE TABLE public.schedule_weeks (
  week_start date PRIMARY KEY,
  status public.schedule_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_weeks TO authenticated;
GRANT ALL ON public.schedule_weeks TO service_role;

ALTER TABLE public.schedule_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view schedule weeks"
  ON public.schedule_weeks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert schedule weeks"
  ON public.schedule_weeks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update schedule weeks"
  ON public.schedule_weeks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete schedule weeks"
  ON public.schedule_weeks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER touch_schedule_weeks
  BEFORE UPDATE ON public.schedule_weeks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- shift_swap_requests
CREATE TABLE public.shift_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  from_employee_id uuid NOT NULL,
  to_employee_id uuid NOT NULL,
  proposed_by uuid NOT NULL,
  status public.swap_status NOT NULL DEFAULT 'pending',
  reason text,
  decision_notes text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shift_swap_requests_shift_id_idx ON public.shift_swap_requests(shift_id);
CREATE INDEX shift_swap_requests_status_idx ON public.shift_swap_requests(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_swap_requests TO authenticated;
GRANT ALL ON public.shift_swap_requests TO service_role;

ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view swap requests"
  ON public.shift_swap_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can propose swaps"
  ON public.shift_swap_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager') AND proposed_by = auth.uid());
CREATE POLICY "Supervisors can decide swaps"
  ON public.shift_swap_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'shift_lead') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'shift_lead') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can cancel swaps"
  ON public.shift_swap_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER touch_shift_swap_requests
  BEFORE UPDATE ON public.shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
