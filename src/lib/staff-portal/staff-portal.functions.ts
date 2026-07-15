import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Shift } from "@/features/schedule/types";
import type { AttendanceRow } from "@/lib/attendance/attendance.functions";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export interface MyProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  employee_code: string | null;
  primary_position_id: string | null;
  primary_position_name: string | null;
  availability: Record<string, string[]>;
  status: "active" | "inactive";
  max_hours_per_week: number | null;
}

export const listMyShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ weekStart: dateSchema, weekEnd: dateSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<Shift[]> => {
    const { data: rows, error } = await context.supabase
      .from("shifts")
      .select(
        "id, employee_id, work_date, start_time, end_time, position_id, break_minutes, notes, created_at",
      )
      .eq("employee_id", context.userId)
      .gte("work_date", data.weekStart)
      .lte("work_date", data.weekEnd)
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, employee_code, primary_position_id")
      .eq("id", context.userId)
      .maybeSingle();

    const posIds = Array.from(
      new Set(rows.map((r: any) => r.position_id).filter(Boolean)),
    ) as string[];
    const posMap = new Map<string, string>();
    if (posIds.length) {
      const { data: pos } = await context.supabase
        .from("positions")
        .select("id, name")
        .in("id", posIds);
      (pos ?? []).forEach((p: any) => posMap.set(p.id, p.name));
    }

    return rows.map((r: any) => ({
      id: r.id,
      employee_id: r.employee_id,
      employee_name: profile?.full_name ?? "Me",
      employee_code: profile?.employee_code ?? null,
      work_date: r.work_date,
      start_time: (r.start_time as string).slice(0, 5),
      end_time: (r.end_time as string).slice(0, 5),
      position_id: r.position_id,
      position_name: r.position_id ? posMap.get(r.position_id) ?? null : null,
      break_minutes: r.break_minutes ?? 0,
      notes: r.notes ?? null,
      created_at: r.created_at,
    }));
  });

export const listMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ from: dateSchema, to: dateSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<AttendanceRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("attendance")
      .select("id, employee_id, work_date, clock_in_at, clock_out_at")
      .eq("employee_id", context.userId)
      .gte("work_date", data.from)
      .lte("work_date", data.to)
      .order("clock_in_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, employee_code, primary_position_id")
      .eq("id", context.userId)
      .maybeSingle();
    let positionName: string | null = null;
    if (profile?.primary_position_id) {
      const { data: pos } = await context.supabase
        .from("positions")
        .select("name")
        .eq("id", profile.primary_position_id)
        .maybeSingle();
      positionName = pos?.name ?? null;
    }

    return (rows ?? []).map((r: any) => {
      const hours = r.clock_out_at
        ? Math.max(
            0,
            (new Date(r.clock_out_at).getTime() -
              new Date(r.clock_in_at).getTime()) /
              3_600_000,
          )
        : 0;
      return {
        id: r.id,
        employee_id: r.employee_id,
        employee_name: profile?.full_name ?? "Me",
        employee_code: profile?.employee_code ?? null,
        position_name: positionName,
        work_date: r.work_date,
        clock_in_at: r.clock_in_at,
        clock_out_at: r.clock_out_at,
        hours,
      };
    });
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile> => {
    const { data: p, error } = await context.supabase
      .from("profiles")
      .select(
        "id, full_name, phone, employee_code, primary_position_id, availability, status, max_hours_per_week",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    let positionName: string | null = null;
    if (p?.primary_position_id) {
      const { data: pos } = await context.supabase
        .from("positions")
        .select("name")
        .eq("id", p.primary_position_id)
        .maybeSingle();
      positionName = pos?.name ?? null;
    }
    return {
      id: context.userId,
      full_name: p?.full_name ?? "",
      email: context.claims?.email ?? null,
      phone: p?.phone ?? null,
      employee_code: p?.employee_code ?? null,
      primary_position_id: p?.primary_position_id ?? null,
      primary_position_name: positionName,
      availability: (p?.availability as any) ?? {},
      status: (p?.status as "active" | "inactive") ?? "active",
      max_hours_per_week: p?.max_hours_per_week ?? null,
    };
  });

export const updateMyPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ phone: z.string().trim().max(40).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ phone: data.phone || null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
