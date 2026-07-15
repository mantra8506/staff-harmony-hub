import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Moon, Save, Sun, Upload, User, Utensils } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RESTAURANT } from "@/components/layout/AppShell";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: `Settings — ${RESTAURANT.name}` }] }),
  component: SettingsPage,
});

const THEME_KEY = "shh-theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

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
  const [phone, setPhone] = useState(
    (user?.user_metadata?.phone as string | undefined) ?? "",
  );
  const [saving, setSaving] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [notifyShifts, setNotifyShifts] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem(THEME_KEY)) as
      | "light"
      | "dark"
      | null;
    const isDark =
      stored === "dark" ||
      (stored === null && document.documentElement.classList.contains("dark"));
    setDarkMode(isDark);
  }, []);

  function toggleDark(next: boolean) {
    setDarkMode(next);
    applyTheme(next ? "dark" : "light");
  }

  const initials = (managerName || email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
          Manage your profile, appearance, and restaurant details.
        </p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Choose how Staff Harmony Hub looks to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-md bg-background text-foreground shadow-sm"
                  aria-hidden
                >
                  {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </span>
                <div>
                  <Label htmlFor="dark-mode" className="text-sm font-medium">
                    Dark mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {darkMode ? "Dark theme is on." : "Switch to a low-light theme."}
                  </p>
                </div>
              </div>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={toggleDark} />
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Your personal profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-brand text-brand-foreground text-lg">
                  {initials || <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Profile photo</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled>
                    <Upload className="mr-2 h-4 w-4" /> Upload photo
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Coming soon
                  </span>
                </div>
              </div>
            </div>

            <Separator />

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
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email changes are not available in the prototype.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {isManager ? "Manager" : "Staff"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>Choose what you want to be notified about.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="notify-shifts" className="text-sm font-medium">
                    Shift updates
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When a shift is published or changed.
                  </p>
                </div>
              </div>
              <Switch
                id="notify-shifts"
                checked={notifyShifts}
                onCheckedChange={setNotifyShifts}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="notify-ann" className="text-sm font-medium">
                    Announcements
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    New posts from your manager.
                  </p>
                </div>
              </div>
              <Switch
                id="notify-ann"
                checked={notifyAnnouncements}
                onCheckedChange={setNotifyAnnouncements}
              />
            </div>
          </CardContent>
        </Card>

        {/* Restaurant */}
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
