import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffMember } from "@/features/staff/types";

const inviteSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : null)),
  primaryPositionId: z
    .string()
    .uuid()
    .optional()
    .transform((v) => (v ? v : null)),
});

const updateSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  primaryPositionId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

const removeSchema = z.object({
  userId: z.string().uuid(),
});

async function assertManager(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "manager",
  });
  if (error) throw new Error("Permission check failed");
  if (data !== true) throw new Error("Only managers can perform this action.");
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMember[]> => {
    const { data: profiles, error: pErr } = await context.supabase
      .from("profiles")
      .select(
        "id, full_name, phone, primary_position_id, created_at, positions(name)",
      )
      .order("full_name", { ascending: true });
    if (pErr) throw new Error(pErr.message);

    const { data: roles, error: rErr } = await context.supabase
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);

    const rolesByUser = new Map<string, ("manager" | "shift_lead" | "staff")[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    // Email + invite status requires admin client.
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const emails = new Map<string, { email: string | null; pending: boolean }>();
    const ids = (profiles ?? []).map((p: any) => p.id);
    for (const id of ids) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      emails.set(id, {
        email: u?.user?.email ?? null,
        pending: u?.user ? !u.user.last_sign_in_at : false,
      });
    }

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      primary_position_id: p.primary_position_id,
      position_name: p.positions?.name ?? null,
      roles: rolesByUser.get(p.id) ?? [],
      email: emails.get(p.id)?.email ?? null,
      pending_invite: emails.get(p.id)?.pending ?? false,
      created_at: p.created_at,
    }));
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

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const redirectTo = `${process.env.SUPABASE_URL ? "" : ""}`;
    const siteUrl = process.env.SITE_URL ?? undefined;

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          primary_position_id: data.primaryPositionId,
          role: "staff",
        },
        redirectTo: siteUrl ? `${siteUrl}/welcome` : undefined,
      },
    );
    void redirectTo;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    // A user can edit their own profile; managers can edit anyone.
    if (context.userId !== data.userId) {
      await assertManager(context);
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        primary_position_id: data.primaryPositionId,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => removeSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot remove your own account.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
