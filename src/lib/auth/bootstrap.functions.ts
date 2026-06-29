import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bootstrapSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(1).max(100),
});

export const checkBootstrapNeeded = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("any_manager_exists");
    if (error) throw new Error("Could not check setup status");
    return { needsBootstrap: data === false };
  },
);

export const bootstrapManager = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bootstrapSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Guard: only allowed if no manager exists yet.
    const { data: exists, error: existsErr } = await supabaseAdmin.rpc(
      "any_manager_exists",
    );
    if (existsErr) throw new Error("Setup check failed");
    if (exists === true) {
      throw new Error("Setup has already been completed.");
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        role: "manager",
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });
