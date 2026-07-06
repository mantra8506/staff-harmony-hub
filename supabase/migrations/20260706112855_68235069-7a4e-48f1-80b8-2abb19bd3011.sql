
-- Announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Attendance
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX attendance_employee_date_idx ON public.attendance (employee_id, work_date DESC);
CREATE INDEX attendance_date_idx ON public.attendance (work_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can clock themselves in"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can update own attendance or managers can"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid() OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (employee_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete attendance"
  ON public.attendance FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
