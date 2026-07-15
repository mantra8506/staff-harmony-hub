import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Upload, Utensils } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RESTAURANT } from "@/components/layout/AppShell";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: `Settings — ${RESTAURANT.name}` }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, roles } = useCurrentUser();
  const isManager = roles.includes("manager");

  const [restaurantName, setRestaurantName] = useState(RESTAURANT.name);
  const [managerName, setManagerName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ??
      user?.email?.split("@")[0] ??
      "",
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success("Settings saved", {
      description: "Your preferences have been updated.",
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your restaurant profile and account details.
        </p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restaurant</CardTitle>
            <CardDescription>How your restaurant appears across the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm"
                aria-hidden
              >
                <Utensils className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Restaurant logo</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled>
                    <Upload className="mr-2 h-4 w-4" /> Upload logo
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Coming with custom branding
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="restaurant-name">Restaurant name</Label>
              <Input
                id="restaurant-name"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                disabled={!isManager}
              />
              <p className="text-xs text-muted-foreground">
                Powered by Staff Harmony Hub
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Your personal profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="manager-name">Full name</Label>
              <Input
                id="manager-name"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
              <p className="text-xs text-muted-foreground">
                Email changes are not available in the prototype.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {isManager ? "Manager" : "Staff"}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
