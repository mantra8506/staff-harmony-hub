import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface Announcement {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

const dateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .nullable()
  .optional();

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  eventDate: dateOrNull,
});

const updateSchema = createSchema.extend({ id: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });

async function assertManager(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "manager",
  });
  if (data !== true) throw new Error("Only managers can manage announcements.");
}

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Announcement[]> => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id, title, description, event_date, created_by, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const ids = Array.from(
      new Set(rows.map((r) => r.created_by).filter(Boolean)),
    ) as string[];
    let names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      (profiles ?? []).forEach((p: any) => names.set(p.id, p.full_name));
    }
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      event_date: r.event_date,
      created_by: r.created_by,
      created_by_name: r.created_by ? names.get(r.created_by) ?? null : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { error } = await context.supabase.from("announcements").insert({
      title: data.title,
      description: data.description ?? null,
      event_date: data.eventDate ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { error } = await context.supabase
      .from("announcements")
      .update({
        title: data.title,
        description: data.description ?? null,
        event_date: data.eventDate ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { error } = await context.supabase
      .from("announcements")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
