import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  shiftId: z.string().uuid(),
  newEmployeeId: z.string().uuid(),
});

/**
 * Prototype-simple shift reassignment. Manager-only, no approval flow.
 */
export const reassignShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isManager } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "manager",
    });
    if (!isManager) throw new Error("Only managers can reassign shifts.");
    const { error } = await context.supabase
      .from("shifts")
      .update({ employee_id: data.newEmployeeId })
      .eq("id", data.shiftId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
