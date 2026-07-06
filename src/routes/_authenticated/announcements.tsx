import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarClock,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RESTAURANT } from "@/components/layout/AppShell";
import { announcementsQueryOptions } from "@/features/operations/queries";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  type Announcement,
} from "@/lib/announcements/announcements.functions";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({
    meta: [{ title: `Announcements — ${RESTAURANT.name}` }],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(announcementsQueryOptions),
  component: AnnouncementsPage,
});

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

function AnnouncementsPage() {
  const { roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const q = useSuspenseQuery(announcementsQueryOptions);
  const items = q.data;
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const startEdit = (a: Announcement) => {
    setEditing(a);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Announcements
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Share updates, events, and reminders with the team.
          </p>
        </div>
        {isManager && (
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" />
            New announcement
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand">
              <Megaphone className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold">No announcements yet</h2>
            <p className="text-sm text-muted-foreground">
              {isManager
                ? "Post your first update so the team stays in the loop."
                : "Check back later for updates from your manager."}
            </p>
            {isManager && (
              <Button onClick={startCreate} size="sm">
                <Plus className="h-4 w-4" />
                Create announcement
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((a) => (
            <AnnouncementCard
              key={a.id}
              a={a}
              isManager={isManager}
              onEdit={() => startEdit(a)}
            />
          ))}
        </div>
      )}

      <AnnouncementDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
      />
    </div>
  );
}

function AnnouncementCard({
  a,
  isManager,
  onEdit,
}: {
  a: Announcement;
  isManager: boolean;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteAnnouncement);
  const deleteM = useMutation({
    mutationFn: () => deleteFn({ data: { id: a.id } }),
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const createdLabel = new Date(a.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const eventLabel = a.event_date
    ? new Date(a.event_date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">{a.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Posted {createdLabel}
              {a.created_by_name ? ` by ${a.created_by_name}` : ""}
            </p>
            {eventLabel && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                <CalendarClock className="h-3 w-3" />
                {eventLabel}
              </div>
            )}
            {a.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                {a.description}
              </p>
            )}
          </div>
          {isManager && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteM.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AnnouncementDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Announcement | null;
}) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createAnnouncement);
  const updateFn = useServerFn(updateAnnouncement);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      eventDate: editing?.event_date ?? "",
    },
  });

  const saveM = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = {
        title: v.title,
        description: v.description?.trim() ? v.description.trim() : null,
        eventDate: v.eventDate ? v.eventDate : null,
      };
      if (editing) return updateFn({ data: { id: editing.id, ...payload } });
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Announcement updated" : "Announcement posted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit announcement" : "New announcement"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => saveM.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Staff meeting Friday" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} placeholder="Details…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveM.isPending}>
                {saveM.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editing ? "Save" : "Post"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
