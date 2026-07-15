import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RESTAURANT } from "@/components/layout/AppShell";
import { myProfileQueryOptions } from "@/features/staff-portal/queries";
import { updateMyPhone } from "@/lib/staff-portal/staff-portal.functions";
import { SHIFTS, WEEKDAYS } from "@/features/staff/types";

export const Route = createFileRoute("/_authenticated/my/profile")({
  head: () => ({ meta: [{ title: `My profile — ${RESTAURANT.name}` }] }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(myProfileQueryOptions);
  },
  component: MyProfileRoute,
});

function MyProfileRoute() {
  const q = useSuspenseQuery(myProfileQueryOptions);
  const p = q.data;
  const qc = useQueryClient();
  const [phone, setPhone] = useState(p.phone ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const updatePhoneFn = useServerFn(updateMyPhone);
  const phoneM = useMutation({
    mutationFn: () => updatePhoneFn({ data: { phone: phone || null } }),
    onSuccess: () => {
      toast.success("Phone updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update phone"),
  });

  const passwordM = useMutation({
    mutationFn: async () => {
      if (password.length < 8)
        throw new Error("Password must be at least 8 characters.");
      if (password !== password2)
        throw new Error("Passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Password updated");
      setPassword("");
      setPassword2("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your contact and password. Ask your manager for other changes.
        </p>
      </header>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
              <UserIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{p.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.employee_code ? `${p.employee_code} · ` : ""}
                {p.primary_position_name ?? "No position"}
              </p>
            </div>
            <Badge
              variant={p.status === "active" ? "default" : "secondary"}
              className="ml-auto"
            >
              {p.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Personal details</h2>
          <ReadOnly label="Name" value={p.full_name} />
          <ReadOnly label="Email" value={p.email ?? "—"} />
          <ReadOnly label="Position" value={p.primary_position_name ?? "—"} />
          <ReadOnly
            label="Employment status"
            value={p.status === "active" ? "Active" : "Inactive"}
          />
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
              <Button
                onClick={() => phoneM.mutate()}
                disabled={phoneM.isPending || (phone ?? "") === (p.phone ?? "")}
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Weekly availability</h2>
          <div className="grid grid-cols-1 gap-2">
            {WEEKDAYS.map((d) => {
              const av = p.availability?.[d.key] ?? [];
              return (
                <div
                  key={d.key}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{d.long}</span>
                  <span className="text-xs text-muted-foreground">
                    {av.length === 0
                      ? "Unavailable"
                      : av
                          .map(
                            (k) =>
                              SHIFTS.find((s) => s.key === k)?.label ?? k,
                          )
                          .join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Contact your manager to update availability.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Change password</h2>
          <div className="space-y-1.5">
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirm password</Label>
            <Input
              id="pw2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={() => passwordM.mutate()}
            disabled={passwordM.isPending || !password || !password2}
          >
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
