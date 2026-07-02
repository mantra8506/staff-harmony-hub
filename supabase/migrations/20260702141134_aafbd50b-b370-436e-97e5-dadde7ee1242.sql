
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  break_minutes integer NOT NULL DEFAULT 0 CHECK (break_minutes >= 0 AND break_minutes <= 480),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shifts_work_date_idx ON public.shifts(work_date);
CREATE INDEX shifts_employee_idx ON public.shifts(employee_id, work_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shifts"
  ON public.shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert shifts"
  ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update shifts"
  ON public.shifts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete shifts"
  ON public.shifts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
