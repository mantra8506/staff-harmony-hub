import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Calendar } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Today — Staff HQ" }] }),
  component: HomePage,
});

function HomePage() {
  const { user, roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const greeting =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hi, {greeting}</h1>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Manage your team and schedule from one place."
            : "Your shifts and announcements will show up here."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/staff"
          className="group rounded-lg border border-border p-4 transition-colors hover:bg-accent"
        >
          <div className="mb-2 flex items-center gap-2">
            <Users className="size-5 text-muted-foreground group-hover:text-foreground" />
            <span className="font-medium">Staff Directory</span>
          </div>
          <p className="text-sm text-muted-foreground">
            View the team{isManager ? ", invite new members, edit roles." : "."}
          </p>
        </Link>

        <div className="rounded-lg border border-dashed border-border p-4 opacity-60">
          <div className="mb-2 flex items-center gap-2">
            <Calendar className="size-5 text-muted-foreground" />
            <span className="font-medium">Scheduling</span>
          </div>
          <p className="text-sm text-muted-foreground">Coming in the next phase.</p>
        </div>
      </div>
    </div>
  );
}
