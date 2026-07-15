import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RESTAURANT } from "@/components/layout/AppShell";
import { announcementsQueryOptions } from "@/features/operations/queries";

export const Route = createFileRoute("/_authenticated/my/announcements")({
  head: () => ({ meta: [{ title: `Announcements — ${RESTAURANT.name}` }] }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(announcementsQueryOptions);
  },
  component: MyAnnouncements,
});

function MyAnnouncements() {
  const q = useSuspenseQuery(announcementsQueryOptions);
  const items = q.data;
  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Latest updates from your management team.
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Megaphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No announcements available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold">{a.title}</p>
                  {a.event_date ? (
                    <Badge variant="secondary" className="shrink-0">
                      {new Date(a.event_date + "T00:00:00").toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </Badge>
                  ) : null}
                </div>
                {a.description ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {a.description}
                  </p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  {a.created_by_name ? `Posted by ${a.created_by_name} · ` : ""}
                  {new Date(a.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
