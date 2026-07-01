export type AppRole = "manager" | "shift_lead" | "staff";
export type StaffStatus = "active" | "inactive";

export const WEEKDAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number]["key"];

export type Availability = Partial<Record<WeekdayKey, boolean>>;

export interface Position {
  id: string;
  name: string;
  department: string;
  sort_order: number;
}

export interface StaffMember {
  id: string;
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
  pending_invite: boolean;
  created_at: string;
}
