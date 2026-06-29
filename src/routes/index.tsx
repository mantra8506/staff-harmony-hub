import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Staff HQ — Restaurant staff management" },
      {
        name: "description",
        content:
          "Schedules, shift swaps, and your team in one place. Built for full-service restaurants.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-svh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-base font-semibold">Staff HQ</span>
        <Link
          to="/auth"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Run your restaurant team without the group-chat chaos.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          A simple home for your staff directory, schedules, and shift swaps —
          built for full-service teams under 15 people.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Sign in to your team
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Invite-only — ask your manager for an invitation.
        </p>
      </section>
    </main>
  );
}
