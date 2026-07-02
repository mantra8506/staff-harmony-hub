import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizeAvailability,
  type InviteStatus,
  type StaffMember,
  type StaffStatus,
} from "@/features/staff/types";

const shiftEnum = z.enum(["morning", "afternoon", "evening"]);
const availabilitySchema = z
  .record(
    z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    z.array(shiftEnum).max(3),
  )
  .default({});

const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d][\d\s\-().]{5,29}$/, { message: "Enter a valid phone number" });

const baseFields = {
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  phone: phoneSchema,
  primaryPositionId: z.string().uuid("Select a primary position"),
  secondaryPositionIds: z.array(z.string().uuid()).max(10).default([]),
  availability: availabilitySchema,
  maxHoursPerWeek: z
    .number()
    .int()
    .min(0)
    .max(168)
    .nullable()
    .optional()
    .transform((v) => (v == null ? null : v)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  status: z.enum(["active", "inactive"]).default("active"),
};

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  ...baseFields,
});

const updateSchema = z.object({
  userId: z.string().uuid(),
  ...baseFields,
});

const statusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

const getSchema = z.object({ userId: z.string().uuid() });
const userIdSchema = z.object({ userId: z.string().uuid() });

const INVITE_TTL_DAYS = 7;

async function assertManager(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "manager",
  });
  if (error) throw new Error("Permission check failed");
  if (data !== true) throw new Error("Only managers can perform this action.");
}

function normalizedDigits(s: string | null | undefined) {
  if (!s) return "";
  return s.replace(/\D/g, "");
}

type AuthMeta = {
  email: string | null;
  banned: boolean;
  lastSignInAt: string | null;
};

async function loadAuthMeta(userIds: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const map = new Map<string, AuthMeta>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const user: any = data?.user;
      map.set(id, {
        email: user?.email ?? null,
        banned: !!user?.banned_until && new Date(user.banned_until) > new Date(),
        lastSignInAt: user?.last_sign_in_at ?? null,
      });
    }),
  );
  return map;
}

function computeInviteStatus(row: {
  invited_at: string | null;
  invite_expires_at: string | null;
}, meta: AuthMeta | undefined, roles: string[]): InviteStatus {
  // Managers/bootstrap users usually don't have invited_at → treat as accepted.
  if (meta?.lastSignInAt) return "accepted";
  if (!row.invited_at) return roles.includes("manager") ? "accepted" : "none";
  if (row.invite_expires_at && new Date(row.invite_expires_at) < new Date()) {
    return "expired";
  }
  return "pending";
}

function toStaffMember(
  row: any,
  positions: Map<string, string>,
  roles: string[],
  meta: AuthMeta | undefined,
): StaffMember {
  const secondary = (row.secondary_position_ids ?? []) as string[];
  return {
    id: row.id,
    employee_code: row.employee_code ?? null,
    full_name: row.full_name,
    phone: row.phone,
    primary_position_id: row.primary_position_id,
    primary_position_name: row.primary_position_id ? positions.get(row.primary_position_id) ?? null : null,
    secondary_position_ids: secondary,
    secondary_position_names: secondary.map((id) => positions.get(id) ?? "Unknown"),
    availability: normalizeAvailability(row.availability),
    max_hours_per_week: row.max_hours_per_week,
    notes: row.notes,
    status: (row.status ?? "active") as StaffStatus,
    roles: roles as StaffMember["roles"],
    email: meta?.email ?? null,
    invite_status: computeInviteStatus(row, meta, roles),
    invited_at: row.invited_at ?? null,
    invite_expires_at: row.invite_expires_at ?? null,
    created_at: row.created_at,
  };
}

const PROFILE_COLUMNS =
  "id, employee_code, full_name, phone, primary_position_id, secondary_position_ids, availability, max_hours_per_week, notes, status, invited_at, invite_expires_at, created_at";

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMember[]> => {
    const [{ data: profiles, error: pErr }, { data: rolesData, error: rErr }, { data: positionsData }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .order("full_name", { ascending: true }),
        context.supabase.from("user_roles").select("user_id, role"),
        context.supabase.from("positions").select("id, name"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    const positionsMap = new Map<string, string>();
    for (const p of positionsData ?? []) positionsMap.set(p.id, p.name);

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesData ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    const meta = await loadAuthMeta((profiles ?? []).map((p: any) => p.id));

    return (profiles ?? []).map((p: any) =>
      toStaffMember(p, positionsMap, rolesByUser.get(p.id) ?? [], meta.get(p.id)),
    );
  });

export const getStaffMember = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => getSchema.parse(data))
  .handler(async ({ data, context }): Promise<StaffMember> => {
    const [{ data: profile, error }, { data: rolesData }, { data: positionsData }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", data.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", data.userId),
      context.supabase.from("positions").select("id, name"),
    ]);
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Staff member not found");
    const positionsMap = new Map<string, string>();
    for (const p of positionsData ?? []) positionsMap.set(p.id, p.name);
    const meta = await loadAuthMeta([profile.id]);
    return toStaffMember(
      profile,
      positionsMap,
      (rolesData ?? []).map((r: any) => r.role),
      meta.get(profile.id),
    );
  });

export const listPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("positions")
      .select("id, name, department, sort_order")
      .order("department", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

async function assertUniquePhone(
  context: { supabase: any },
  phone: string,
  excludeUserId?: string,
) {
  const digits = normalizedDigits(phone);
  if (!digits) return;
  const { data, error } = await context.supabase.from("profiles").select("id, phone");
  if (error) throw new Error(error.message);
  const clash = (data ?? []).find(
    (r: any) => r.id !== excludeUserId && normalizedDigits(r.phone) === digits,
  );
  if (clash) throw new Error("A staff member with this phone number already exists.");
}

function inviteExpiryDate() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000).toISOString();
}

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    await assertUniquePhone(context, data.phone);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const dupe = existing?.users?.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (dupe) throw new Error("A user with this email already exists.");

    const siteUrl = process.env.SITE_URL ?? undefined;
    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: {
        full_name: data.fullName,
        phone: data.phone,
        primary_position_id: data.primaryPositionId,
        role: "staff",
      },
      redirectTo: siteUrl ? `${siteUrl}/welcome` : undefined,
    });
    if (error) throw new Error(error.message);
    const newUserId = created?.user?.id;
    if (!newUserId) throw new Error("Invite created but user id missing.");

    const now = new Date().toISOString();
    const { error: upErr } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        primary_position_id: data.primaryPositionId,
        secondary_position_ids: data.secondaryPositionIds,
        availability: data.availability,
        max_hours_per_week: data.maxHoursPerWeek,
        notes: data.notes,
        status: data.status,
        invited_at: now,
        invite_expires_at: inviteExpiryDate(),
      })
      .eq("id", newUserId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, userId: newUserId, emailDelivered: false };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (context.userId !== data.userId) await assertManager(context);
    await assertUniquePhone(context, data.phone, data.userId);

    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        primary_position_id: data.primaryPositionId,
        secondary_position_ids: data.secondaryPositionIds,
        availability: data.availability,
        max_hours_per_week: data.maxHoursPerWeek,
        notes: data.notes,
        status: data.status,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.status === "inactive" ? "876000h" : "none",
    } as any);

    return { ok: true };
  });

export const setStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    if (data.userId === context.userId && data.status === "inactive") {
      throw new Error("You cannot deactivate your own account.");
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.status === "inactive" ? "876000h" : "none",
    } as any);
    return { ok: true };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => userIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertManager(context);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("Staff member not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = (authUser?.user as any)?.email;
    if (!email) throw new Error("This staff member has no email on file.");
    if ((authUser?.user as any)?.last_sign_in_at) {
      throw new Error("This staff member has already accepted the invite.");
    }

    const siteUrl = process.env.SITE_URL ?? undefined;
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: profile.full_name, role: "staff" },
      redirectTo: siteUrl ? `${siteUrl}/welcome` : undefined,
    });
    if (error) throw new Error(error.message);

    await context.supabase
      .from("profiles")
      .update({
        invited_at: new Date().toISOString(),
        invite_expires_at: inviteExpiryDate(),
      })
      .eq("id", data.userId);

    return { ok: true };
  });

export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => userIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot cancel your own invite.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if ((authUser?.user as any)?.last_sign_in_at) {
      throw new Error("This staff member has already accepted the invite and cannot be cancelled here. Deactivate them instead.");
    }

    // Remove the auth user; the profile row cascades via the FK on profiles.id.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    // Best-effort profile cleanup in case FK is not cascading.
    await context.supabase.from("profiles").delete().eq("id", data.userId);

    return { ok: true };
  });
