import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Staff HQ" },
      { name: "description", content: "Staff management for your restaurant." },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      navigate({
        to: data.user ? "/staff" : "/auth",
        replace: true,
      });
    });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
