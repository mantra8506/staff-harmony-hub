export type AppRole = "manager" | "shift_lead" | "staff";

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
  position_name: string | null;
  roles: AppRole[];
  email: string | null;
  pending_invite: boolean;
  created_at: string;
}
