import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AttendanceRow {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  position_name: string | null;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  hours: number;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const rangeSchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

const idSchema = z.object({ id: z.string().uuid() });

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function hoursBetween(inAt: string, outAt: string | null): number {
  if (!outAt) return 0;
  const diff = new Date(outAt).getTime() - new Date(inAt).getTime();
  return Math.max(0, diff / (1000 * 60 * 60));
}

async function mapRows(
  ctx: { supabase: any },
  rows: any[],
): Promise<AttendanceRow[]> {
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((r) => r.employee_id))) as string[];
  const { data: profiles } = await ctx.supabase
    .from("profiles")
    .select("id, full_name, employee_code, primary_position_id")
    .in("id", ids);
  const positionIds = Array.from(
    new Set((profiles ?? []).map((p: any) => p.primary_position_id).filter(Boolean)),
  ) as string[];
  let positions = new Map<string, string>();
  if (positionIds.length) {
    const { data: pos } = await ctx.supabase
      .from("positions")
      .select("id, name")
      .in("id", positionIds);
    (pos ?? []).forEach((p: any) => positions.set(p.id, p.name));
  }
  const pMap = new Map<
    string,
    { name: string; code: string | null; position: string | null }
  >();
  (profiles ?? []).forEach((p: any) =>
    pMap.set(p.id, {
      name: p.full_name,
      code: p.employee_code ?? null,
      position: p.primary_position_id
        ? positions.get(p.primary_position_id) ?? null
        : null,
    }),
  );
  return rows.map((r) => {
    const info = pMap.get(r.employee_id);
    return {
      id: r.id,
      employee_id: r.employee_id,
      employee_name: info?.name ?? "Unknown",
      employee_code: info?.code ?? null,
      position_name: info?.position ?? null,
      work_date: r.work_date,
      clock_in_at: r.clock_in_at,
      clock_out_at: r.clock_out_at,
      hours: hoursBetween(r.clock_in_at, r.clock_out_at),
    };
  });
}

export const listAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }): Promise<AttendanceRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("attendance")
      .select("id, employee_id, work_date, clock_in_at, clock_out_at")
      .gte("work_date", data.from)
      .lte("work_date", data.to)
      .order("clock_in_at", { ascending: false });
    if (error) throw new Error(error.message);
    return mapRows(context, rows ?? []);
  });

export const clockIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ employeeId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const employeeId = data.employeeId ?? context.userId;
    if (employeeId !== context.userId) {
      const { data: isManager } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "manager",
      });
      if (!isManager) throw new Error("Only managers can clock in others.");
    }
    const today = todayISO();
    // Prevent duplicate open shift
    const { data: open } = await context.supabase
      .from("attendance")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("work_date", today)
      .is("clock_out_at", null)
      .maybeSingle();
    if (open) throw new Error("Already clocked in.");

    const { error } = await context.supabase.from("attendance").insert({
      employee_id: employeeId,
      work_date: today,
      clock_in_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("attendance")
      .update({ clock_out_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isManager } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "manager",
    });
    if (!isManager) throw new Error("Only managers can delete attendance.");
    const { error } = await context.supabase
      .from("attendance")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
