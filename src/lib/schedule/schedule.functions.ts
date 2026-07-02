import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Shift, ScheduleWeek } from "@/features/schedule/types";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const timeSchema = z.string().regex(timeRegex, "Use HH:MM");

const rangeSchema = z.object({
  weekStart: dateSchema,
  weekEnd: dateSchema,
});

const createSchema = z.object({
  employeeId: z.string().uuid(),
  workDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  positionId: z.string().uuid().nullable().optional(),
  breakMinutes: z.number().int().min(0).max(480).default(0),
  notes: z.string().trim().max(500).nullable().optional(),
});

const updateSchema = createSchema.extend({ id: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });
const weekStartSchema = z.object({ weekStart: dateSchema });

async function assertManager(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "manager",
  });
  if (error) throw new Error("Permission check failed");
  if (data !== true) throw new Error("Only managers can manage shifts.");
}

/** Compute Monday-start ISO for a given YYYY-MM-DD workDate. */
function weekStartFor(workDate: string): string {
  const d = new Date(`${workDate}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function assertWeekEditable(
  context: { supabase: any },
  workDate: string,
) {
  const wStart = weekStartFor(workDate);
  const { data } = await context.supabase
    .from("schedule_weeks")
    .select("status")
    .eq("week_start", wStart)
    .maybeSingle();
  if (data?.status === "published") {
    throw new Error(
      "This week is published and locked. Unpublish it before editing.",
    );
  }
}

async function mapShifts(context: { supabase: any }, rows: any[]): Promise<Shift[]> {
  if (rows.length === 0) return [];
  const employeeIds = Array.from(new Set(rows.map((r) => r.employee_id)));
  const positionIds = Array.from(
    new Set(rows.map((r) => r.position_id).filter(Boolean)),
  ) as string[];

  const [{ data: profiles }, { data: positions }] = await Promise.all([
    context.supabase
      .from("profiles")
      .select("id, full_name, employee_code")
      .in("id", employeeIds),
    positionIds.length
      ? context.supabase.from("positions").select("id, name").in("id", positionIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const pMap = new Map<string, { name: string; code: string | null }>();
  (profiles ?? []).forEach((p: any) =>
    pMap.set(p.id, { name: p.full_name, code: p.employee_code ?? null }),
  );
  const posMap = new Map<string, string>();
  (positions ?? []).forEach((p: any) => posMap.set(p.id, p.name));

  return rows.map((r) => ({
    id: r.id,
    employee_id: r.employee_id,
    employee_name: pMap.get(r.employee_id)?.name ?? "Unknown",
    employee_code: pMap.get(r.employee_id)?.code ?? null,
    work_date: r.work_date,
    start_time: (r.start_time as string).slice(0, 5),
    end_time: (r.end_time as string).slice(0, 5),
    position_id: r.position_id,
    position_name: r.position_id ? posMap.get(r.position_id) ?? null : null,
    break_minutes: r.break_minutes ?? 0,
    notes: r.notes ?? null,
    created_at: r.created_at,
  }));
}

export const listShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }): Promise<Shift[]> => {
    const { data: rows, error } = await context.supabase
      .from("shifts")
      .select(
        "id, employee_id, work_date, start_time, end_time, position_id, break_minutes, notes, created_at",
      )
      .gte("work_date", data.weekStart)
      .lte("work_date", data.weekEnd)
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return mapShifts(context, rows ?? []);
  });

export const createShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    await assertWeekEditable(context, data.workDate);
    const { error } = await context.supabase.from("shifts").insert({
      employee_id: data.employeeId,
      work_date: data.workDate,
      start_time: data.startTime,
      end_time: data.endTime,
      position_id: data.positionId ?? null,
      break_minutes: data.breakMinutes ?? 0,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    await assertWeekEditable(context, data.workDate);
    const { error } = await context.supabase
      .from("shifts")
      .update({
        employee_id: data.employeeId,
        work_date: data.workDate,
        start_time: data.startTime,
        end_time: data.endTime,
        position_id: data.positionId ?? null,
        break_minutes: data.breakMinutes ?? 0,
        notes: data.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    // Look up the shift's work_date to assert editability
    const { data: existing } = await context.supabase
      .from("shifts")
      .select("work_date")
      .eq("id", data.id)
      .maybeSingle();
    if (existing?.work_date) await assertWeekEditable(context, existing.work_date);
    const { error } = await context.supabase.from("shifts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Publish / unpublish ---------------- */

export const getWeekStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => weekStartSchema.parse(d))
  .handler(async ({ data, context }): Promise<ScheduleWeek> => {
    const { data: row } = await context.supabase
      .from("schedule_weeks")
      .select("week_start, status, published_at, published_by")
      .eq("week_start", data.weekStart)
      .maybeSingle();

    let publisherName: string | null = null;
    if (row?.published_by) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", row.published_by)
        .maybeSingle();
      publisherName = prof?.full_name ?? null;
    }

    return {
      week_start: data.weekStart,
      status: (row?.status as "draft" | "published") ?? "draft",
      published_at: row?.published_at ?? null,
      published_by: row?.published_by ?? null,
      published_by_name: publisherName,
    };
  });

export const publishWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => weekStartSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { error } = await context.supabase
      .from("schedule_weeks")
      .upsert(
        {
          week_start: data.weekStart,
          status: "published",
          published_at: new Date().toISOString(),
          published_by: context.userId,
        },
        { onConflict: "week_start" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unpublishWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => weekStartSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { error } = await context.supabase
      .from("schedule_weeks")
      .upsert(
        {
          week_start: data.weekStart,
          status: "draft",
          published_at: null,
          published_by: null,
        },
        { onConflict: "week_start" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
