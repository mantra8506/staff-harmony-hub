import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SwapRequest } from "@/features/schedule/types";

const idSchema = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  shiftId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  reason: z.string().trim().max(500).nullable().optional(),
});

const decideSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(500).nullable().optional(),
});

async function requireRole(
  context: { supabase: any; userId: string },
  roles: Array<"manager" | "shift_lead">,
) {
  for (const r of roles) {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: r,
    });
    if (data === true) return r;
  }
  throw new Error("You do not have permission to perform this action.");
}

async function mapSwaps(
  context: { supabase: any },
  rows: any[],
): Promise<SwapRequest[]> {
  if (rows.length === 0) return [];
  const shiftIds = Array.from(new Set(rows.map((r) => r.shift_id)));
  const userIds = new Set<string>();
  rows.forEach((r) => {
    userIds.add(r.from_employee_id);
    userIds.add(r.to_employee_id);
    userIds.add(r.proposed_by);
    if (r.decided_by) userIds.add(r.decided_by);
  });

  const [{ data: shifts }, { data: profiles }] = await Promise.all([
    context.supabase
      .from("shifts")
      .select("id, work_date, start_time, end_time, position_id")
      .in("id", shiftIds),
    context.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(userIds)),
  ]);

  const positionIds = Array.from(
    new Set((shifts ?? []).map((s: any) => s.position_id).filter(Boolean)),
  ) as string[];
  const { data: positions } = positionIds.length
    ? await context.supabase.from("positions").select("id, name").in("id", positionIds)
    : { data: [] as any[] };

  const shiftMap = new Map<string, any>();
  (shifts ?? []).forEach((s: any) => shiftMap.set(s.id, s));
  const nameMap = new Map<string, string>();
  (profiles ?? []).forEach((p: any) => nameMap.set(p.id, p.full_name));
  const posMap = new Map<string, string>();
  (positions ?? []).forEach((p: any) => posMap.set(p.id, p.name));

  return rows.map((r) => {
    const s = shiftMap.get(r.shift_id);
    return {
      id: r.id,
      shift_id: r.shift_id,
      work_date: s?.work_date ?? "",
      start_time: (s?.start_time as string | undefined)?.slice(0, 5) ?? "",
      end_time: (s?.end_time as string | undefined)?.slice(0, 5) ?? "",
      position_id: s?.position_id ?? null,
      position_name: s?.position_id ? posMap.get(s.position_id) ?? null : null,
      from_employee_id: r.from_employee_id,
      from_employee_name: nameMap.get(r.from_employee_id) ?? "Unknown",
      to_employee_id: r.to_employee_id,
      to_employee_name: nameMap.get(r.to_employee_id) ?? "Unknown",
      proposed_by: r.proposed_by,
      proposed_by_name: nameMap.get(r.proposed_by) ?? null,
      status: r.status,
      reason: r.reason ?? null,
      decision_notes: r.decision_notes ?? null,
      decided_by: r.decided_by ?? null,
      decided_by_name: r.decided_by ? nameMap.get(r.decided_by) ?? null : null,
      decided_at: r.decided_at ?? null,
      created_at: r.created_at,
    };
  });
}

export const listSwapRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SwapRequest[]> => {
    const { data: rows, error } = await context.supabase
      .from("shift_swap_requests")
      .select(
        "id, shift_id, from_employee_id, to_employee_id, proposed_by, status, reason, decision_notes, decided_by, decided_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return mapSwaps(context, rows ?? []);
  });

export const createSwapRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["manager"]);

    const { data: shift, error: sErr } = await context.supabase
      .from("shifts")
      .select("id, employee_id")
      .eq("id", data.shiftId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!shift) throw new Error("Shift not found.");
    if (shift.employee_id === data.toEmployeeId) {
      throw new Error("Target employee is already assigned to this shift.");
    }

    // Reject if an open pending request already exists for this shift.
    const { data: existing } = await context.supabase
      .from("shift_swap_requests")
      .select("id")
      .eq("shift_id", data.shiftId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      throw new Error("There is already a pending swap request for this shift.");
    }

    const { error } = await context.supabase.from("shift_swap_requests").insert({
      shift_id: data.shiftId,
      from_employee_id: shift.employee_id,
      to_employee_id: data.toEmployeeId,
      proposed_by: context.userId,
      reason: data.reason ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideSwapRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decideSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["shift_lead", "manager"]);

    const { data: req, error: rErr } = await context.supabase
      .from("shift_swap_requests")
      .select("id, shift_id, to_employee_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!req) throw new Error("Swap request not found.");
    if (req.status !== "pending") {
      throw new Error("This request has already been decided.");
    }

    if (data.decision === "approved") {
      // Reassigning a shift bypasses the standard manager-only shifts RLS,
      // so use the service-role client. Role is already verified above.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: uErr } = await supabaseAdmin
        .from("shifts")
        .update({ employee_id: req.to_employee_id })
        .eq("id", req.shift_id);
      if (uErr) throw new Error(uErr.message);
    }

    const { error } = await context.supabase
      .from("shift_swap_requests")
      .update({
        status: data.decision,
        decision_notes: data.notes ?? null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelSwapRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["manager"]);
    const { error } = await context.supabase
      .from("shift_swap_requests")
      .update({
        status: "cancelled",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
