export type AppRole = "manager" | "shift_lead" | "staff";
export type StaffStatus = "active" | "inactive";
export type InviteStatus = "accepted" | "pending" | "expired" | "none";

export const WEEKDAYS = [
  { key: "mon", label: "Mon", long: "Monday" },
  { key: "tue", label: "Tue", long: "Tuesday" },
  { key: "wed", label: "Wed", long: "Wednesday" },
  { key: "thu", label: "Thu", long: "Thursday" },
  { key: "fri", label: "Fri", long: "Friday" },
  { key: "sat", label: "Sat", long: "Saturday" },
  { key: "sun", label: "Sun", long: "Sunday" },
] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number]["key"];

export const SHIFTS = [
  { key: "morning", label: "Morning", hint: "Open – 3pm" },
  { key: "afternoon", label: "Afternoon", hint: "3 – 6pm" },
  { key: "evening", label: "Evening", hint: "6pm – Close" },
] as const;

export type ShiftKey = (typeof SHIFTS)[number]["key"];

/** Per-day list of shifts the staff member is available. Empty = unavailable. */
export type Availability = Partial<Record<WeekdayKey, ShiftKey[]>>;

export interface Position {
  id: string;
  name: string;
  department: string;
  sort_order: number;
}

export interface StaffMember {
  id: string;
  employee_code: string | null;
  full_name: string;
  phone: string | null;
  primary_position_id: string | null;
  primary_position_name: string | null;
  secondary_position_ids: string[];
  secondary_position_names: string[];
  availability: Availability;
  max_hours_per_week: number | null;
  notes: string | null;
  status: StaffStatus;
  roles: AppRole[];
  email: string | null;
  invite_status: InviteStatus;
  invited_at: string | null;
  invite_expires_at: string | null;
  created_at: string;
}

/** Normalize any legacy `{mon: true}` shape into a shift array shape. */
export function normalizeAvailability(raw: unknown): Availability {
  const out: Availability = {};
  if (!raw || typeof raw !== "object") return out;
  for (const day of WEEKDAYS) {
    const v = (raw as any)[day.key];
    if (Array.isArray(v)) {
      out[day.key] = v.filter((s): s is ShiftKey =>
        s === "morning" || s === "afternoon" || s === "evening",
      );
    } else if (v === true) {
      out[day.key] = ["morning", "afternoon", "evening"];
    }
  }
  return out;
}
