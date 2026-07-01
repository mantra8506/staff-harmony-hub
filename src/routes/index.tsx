import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Menu,
  MessageSquare,
  Play,
  Repeat,
  Shield,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Staff Harmony Hub — Restaurant staff management, simplified" },
      {
        name: "description",
        content:
          "Manage your restaurant team without the chaos. Staff directory, weekly schedules, and shift swaps in one calm, professional workspace.",
      },
      { property: "og:title", content: "Staff Harmony Hub" },
      {
        property: "og:description",
        content:
          "The simple, reliable way for restaurants to manage staff, schedules, and shift swaps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <Benefits />
        <DashboardShowcase />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Nav ---------------- */

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground shadow-sm">
        <Utensils className="h-4 w-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        Staff Harmony Hub
      </span>
    </Link>
  );
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing", soon: true },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
              {l.soon && (
                <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Soon
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Manager Login</Link>
          </Button>
          <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/auth">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {l.label} {l.soon && <span className="ml-1 text-xs">(Soon)</span>}
                </a>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Manager Login</Link>
              </Button>
              <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 pt-20 pb-24 md:pt-28 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className="flex flex-col justify-center">
          <Badge
            variant="secondary"
            className="mb-6 w-fit rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <Sparkles className="mr-1.5 h-3 w-3 text-accent-emerald" />
            Built for full-service restaurants
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
            Manage your restaurant team{" "}
            <span className="text-brand">without the chaos.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Replace spreadsheets, paper schedules, and endless group chats with
            one simple place to manage your restaurant staff, schedules, and
            shift swaps.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-11 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link to="/auth">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11">
              <a href="#showcase">
                <Play className="h-4 w-4" /> Watch Demo
              </a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-accent-emerald" /> Invite-only, no
              spam
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-accent-emerald" /> Mobile-friendly
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-accent-emerald" /> Setup in minutes
            </span>
          </div>
        </div>
        <div className="relative">
          <HeroMock />
        </div>
      </div>
    </section>
  );
}

function HeroMock() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand/5 via-transparent to-accent-emerald/5" />
      <div className="relative rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-12px_rgba(15,23,42,0.15)]">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
          <span className="ml-3 text-xs text-muted-foreground">
            staffharmonyhub.app / dashboard
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[180px_1fr]">
          {/* Sidebar */}
          <aside className="hidden flex-col gap-1 rounded-lg bg-muted/40 p-2 sm:flex">
            {[
              { icon: Users, label: "Staff", active: true },
              { icon: CalendarDays, label: "Schedule" },
              { icon: Repeat, label: "Swaps" },
              { icon: MessageSquare, label: "Messages" },
            ].map((i) => (
              <div
                key={i.label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                  i.active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <i.icon className="h-3.5 w-3.5" />
                {i.label}
              </div>
            ))}
          </aside>
          {/* Main */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Staff Directory</div>
                <div className="text-xs text-muted-foreground">12 active</div>
              </div>
              <div className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground">
                Add staff
              </div>
            </div>
            <div className="divide-y divide-border rounded-lg border border-border">
              {[
                { name: "Maya Chen", role: "Server", color: "bg-brand/15 text-brand" },
                { name: "Diego Alvarez", role: "Line cook", color: "bg-accent-emerald/15 text-accent-emerald" },
                { name: "Priya Shah", role: "Host", color: "bg-brand/15 text-brand" },
                { name: "Jordan Lee", role: "Bartender", color: "bg-accent-emerald/15 text-accent-emerald" },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold",
                      s.color,
                    )}
                  >
                    {s.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.role}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
                    Active
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold">This week</div>
                <div className="text-[11px] text-muted-foreground">Mon – Sun</div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-1.5 text-center">
                    <div className="text-[10px] text-muted-foreground">{d}</div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      <div className="h-1.5 rounded-full bg-brand/70" />
                      {i % 2 === 0 && (
                        <div className="h-1.5 rounded-full bg-accent-emerald/70" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating shift-swap card */}
      <div className="absolute -bottom-6 -left-4 hidden w-64 rounded-xl border border-border bg-card p-3 shadow-lg sm:block">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Repeat className="h-3.5 w-3.5 text-accent-emerald" /> Shift swap
          request
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          Diego wants to swap Fri dinner with Jordan.
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <div className="rounded-md bg-accent-emerald px-2 py-1 text-[10px] font-medium text-accent-emerald-foreground">
            Approve
          </div>
          <div className="rounded-md border border-border px-2 py-1 text-[10px] font-medium">
            Decline
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Social Proof ---------------- */

function SocialProof() {
  return (
    <section className="border-b border-border bg-surface/60">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by growing restaurants
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex h-12 items-center justify-center rounded-lg border border-dashed border-border/70 bg-background text-xs text-muted-foreground"
            >
              Restaurant Logo
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */

const FEATURES = [
  {
    icon: Users,
    title: "Staff Management",
    body: "Manage employees, positions, and availability from one clean directory.",
  },
  {
    icon: CalendarDays,
    title: "Scheduling",
    body: "Build and publish weekly schedules in minutes — not evenings.",
  },
  {
    icon: Repeat,
    title: "Shift Swaps",
    body: "Let staff request and approve shift swaps without the WhatsApp mess.",
  },
];

function Features() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeader
          eyebrow="Features"
          title="Everything you need. Nothing you don't."
          subtitle="Focused tools that respect a busy manager's time."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="inline-grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Benefits ---------------- */

const BENEFITS = [
  { icon: Clock, title: "Faster scheduling", body: "Cut schedule building from hours to minutes." },
  { icon: Shield, title: "Fewer missed shifts", body: "Clear ownership and reliable notifications." },
  { icon: MessageSquare, title: "Better communication", body: "One source of truth, not five chat threads." },
  { icon: Sparkles, title: "Less paperwork", body: "Retire the printed schedules and sticky notes." },
  { icon: Check, title: "Cleaner operations", body: "Consistent structure across every service." },
  { icon: Users, title: "Happier team", body: "Staff always know when and where they're working." },
];

function Benefits() {
  return (
    <section id="about" className="border-b border-border bg-surface/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeader
          eyebrow="Why Staff Harmony Hub"
          title="Calm software for a loud business."
          subtitle="We optimize for the outcomes managers actually feel on the floor."
        />
        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4">
              <span className="mt-0.5 inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-emerald/10 text-accent-emerald">
                <b.icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Dashboard Showcase ---------------- */

function DashboardShowcase() {
  return (
    <section id="showcase" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeader
          eyebrow="The Product"
          title="Designed for the pass, not the boardroom."
          subtitle="Every screen is built to be scanned in seconds — on desktop or on a phone between covers."
        />
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ScheduleMock />
          <MobileMock />
        </div>
      </div>
    </section>
  );
}

function ScheduleMock() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const people = ["Maya", "Diego", "Priya", "Jordan", "Sam"];
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <div className="text-sm font-semibold">Weekly Schedule</div>
          <div className="text-xs text-muted-foreground">Jul 6 — Jul 12</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="rounded-md border border-border px-2.5 py-1 text-[11px]">Draft</div>
          <div className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground">
            Publish
          </div>
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        <div className="grid min-w-[560px] grid-cols-[100px_repeat(7,1fr)] gap-1.5 text-xs">
          <div />
          {days.map((d) => (
            <div key={d} className="px-2 py-1 text-center font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {people.map((p, pi) => (
            <Fragment key={p}>
              <div className="flex items-center px-2 py-2 font-medium">
                {p}
              </div>
              {days.map((d, di) => {
                const filled = (pi + di) % 3 !== 0;
                const isSwap = (pi + di) % 5 === 0;
                return (
                  <div
                    key={`${p}-${d}`}
                    className={cn(
                      "rounded-md border p-1.5",
                      filled
                        ? isSwap
                          ? "border-accent-emerald/30 bg-accent-emerald/10"
                          : "border-brand/20 bg-brand/5"
                        : "border-dashed border-border bg-transparent",
                    )}
                  >
                    {filled ? (
                      <>
                        <div className={cn("text-[10px] font-semibold", isSwap ? "text-accent-emerald" : "text-brand")}>
                          {isSwap ? "SWAP" : "5–11p"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {pi % 2 ? "Server" : "Kitchen"}
                        </div>
                      </>
                    ) : (
                      <div className="h-6" />
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileMock() {
  return (
    <div className="mx-auto flex w-full max-w-[280px] flex-col rounded-[36px] border border-border bg-card p-3 shadow-sm">
      <div className="mx-auto mb-2 h-1 w-16 rounded-full bg-muted" />
      <div className="rounded-[24px] border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Tuesday</div>
            <div className="text-sm font-semibold">Your shift</div>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-brand">
            <Utensils className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-border p-3">
          <div className="text-xs text-muted-foreground">5:00pm – 11:00pm</div>
          <div className="mt-0.5 text-sm font-semibold">Dinner service · Server</div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
            <Check className="h-3 w-3" /> Confirmed
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-border p-3">
          <div className="text-xs font-medium">Request swap</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Can't make it? Ask a teammate.
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {["S", "M", "T", "W"].map((d, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg py-2 text-center text-[10px]",
                i === 1 ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Testimonials ---------------- */

function Testimonials() {
  return (
    <section className="border-b border-border bg-surface/60">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <SectionHeader
          eyebrow="Customer Stories"
          title="Real stories, coming soon."
          subtitle="We're onboarding our first restaurants now. Their stories will live here."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-dashed border-border bg-background p-6 text-left"
            >
              <div className="mb-4 h-2 w-14 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-muted" />
                <div className="h-2 w-11/12 rounded-full bg-muted" />
                <div className="h-2 w-2/3 rounded-full bg-muted" />
              </div>
              <div className="mt-6 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-muted" />
                <div className="space-y-1">
                  <div className="h-2 w-16 rounded-full bg-muted" />
                  <div className="h-1.5 w-24 rounded-full bg-muted/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Testimonials coming soon.</p>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

const FAQS = [
  {
    q: "Can I manage multiple restaurants?",
    a: "Multi-restaurant support is on the roadmap. Today, Staff Harmony Hub is designed for a single location so we can keep the experience simple.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. The app is mobile-first — managers and staff can use it on any modern phone browser.",
  },
  {
    q: "Can staff request shift swaps?",
    a: "Shift swaps are a core part of the roadmap. Staff will be able to request swaps and managers can approve them in one tap.",
  },
  {
    q: "Do employees need an account?",
    a: "Yes. Managers invite staff by email — no self sign-ups, so your directory stays clean and secure.",
  },
];

function FAQ() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-24 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-brand">
            FAQ
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Answers before you ask.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Still curious? We're a message away.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <a href="#contact">
              Contact us <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-base font-medium">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */

function CTA() {
  return (
    <section id="contact" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-brand px-8 py-14 text-brand-foreground sm:px-14">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Run a calmer restaurant this week.
              </h2>
              <p className="mt-3 max-w-xl text-brand-foreground/80">
                Get your team on one page — literally. Setup takes a few minutes.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button
                asChild
                size="lg"
                className="h-11 bg-background text-foreground hover:bg-background/90"
              >
                <Link to="/auth">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 border-brand-foreground/30 bg-transparent text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground"
              >
                <Link to="/auth">Manager Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              The simple way to run your restaurant team.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterCol title="Product" links={[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "About", href: "#about" },
            ]} />
            <FooterCol title="Company" links={[
              { label: "Contact", href: "#contact" },
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
            ]} />
            <FooterCol title="Account" links={[
              { label: "Manager Login", href: "/auth" },
              { label: "Get Started", href: "/auth" },
            ]} />
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Staff Harmony Hub. All rights reserved.</span>
          <span>Made for restaurants that would rather be cooking.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-foreground">
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Shared ---------------- */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-medium uppercase tracking-widest text-brand">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
