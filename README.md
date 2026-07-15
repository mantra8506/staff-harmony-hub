# Staff Harmony Hub — Restaurant Staff Management System

A mobile-first staff management platform for small-to-mid sized restaurants. Built for **Station 31 Restaurant & Bar** as the pilot deployment, it helps managers run their team — directory, scheduling, attendance, announcements, and reporting — without enterprise-grade complexity.

> **Status:** First prototype complete — Manager Portal and Staff Portal are both live end-to-end. Branded email delivery is configured (DNS verifying). Payroll and multi-restaurant support are on the roadmap.

---

## Table of Contents

1. [Overview](#overview)
2. [Documentation](#documentation)
3. [Tech Stack](#tech-stack)
4. [Feature Modules](#feature-modules)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Authentication & Roles](#authentication--roles)
9. [Database & Permissions](#database--permissions)
10. [Development Standards](#development-standards)
11. [Roadmap](#roadmap)
12. [Contributing](#contributing)

---

## Overview

This project is being built in **deliberate, professional phases** rather than rushed all at once.

| Phase | Focus | Status |
|---|---|---|
| 1 | Product discovery & requirements | Complete |
| 2 | Development foundation (structure, stack, standards) | Complete |
| 3 | Staff Directory + Auth | Complete |
| 4 | Weekly Schedule (prototype) | Complete |
| 5 | Attendance, Announcements, Reports, Reassignment | Complete |
| 6 | Dedicated Staff Portal (self-service) | Complete |
| 7 | Branded email (custom sender domain) | Complete (DNS verifying) |
| 8 | Payroll export, multi-restaurant support | Future |

Full planning history lives in [`.lovable/plan.md`](./.lovable/plan.md).

---

## Documentation

Complete project documentation lives in [`docs/`](./docs):

| # | Document | What's inside |
|---|---|---|
| 01 | [Product Requirements (PRD)](./docs/01-PRD.md) | Vision, goals, personas, functional & non-functional requirements, scope, metrics, roadmap |
| 02 | [Technical Requirements (TRD)](./docs/02-TRD.md) | Architecture, stack, data model, three-tier permission model, module server-function contracts |
| 03 | [API / Server Function Reference](./docs/03-API.md) | Every `createServerFn` — inputs (Zod), auth level, behavior, return shape, errors |
| 04 | [Data Model & RLS Reference](./docs/04-DATABASE.md) | Enums, tables, grants, verified RLS policies, security-definer functions, JSON shapes |
| 05 | [Manager User Guide](./docs/05-USER-GUIDE.md) | End-to-end walkthrough of every module in the Manager Portal, best practices, troubleshooting |
| 06 | [Developer Setup & Contribution Guide](./docs/06-DEV-SETUP.md) | Local setup, project layout, add-a-feature walkthrough, coding standards, verification checklist |

Start with the PRD for product context, the TRD for architecture, and the Dev Setup guide if you're contributing code.

---

## Tech Stack

| Tech | Role |
|---|---|
| **Lovable** | Build + hosting platform |
| **TanStack Start v1** (React 19 + Vite 7) | Full-stack framework, file-based routing, SSR |
| **TypeScript (strict)** | Language |
| **Tailwind CSS v4** | Styling, mobile-first, semantic tokens |
| **shadcn/ui + Radix** | Accessible UI primitives |
| **TanStack Query** | Server state, caching, loaders |
| **TanStack Router** | Type-safe routing |
| **Lovable Cloud** | Database, Auth, Storage, server functions |
| **Zod** | Schema validation (client + server) |
| **Sonner** | Toast notifications |

---

## Feature Modules

Live in the Manager Portal today:

- **Dashboard** — time-aware greeting, real-time metrics (total staff, on-shift today, pending invites), quick actions, module status grid.
- **Staff Directory** — 4-step invite wizard, auto-generated employee codes (S001…), positions, availability by shift (morning/afternoon/evening), max weekly hours, active/inactive status with auth sync, resend/cancel invites.
- **Weekly Schedule** — 7-day grid (desktop) / single-day view (mobile), create-edit-delete shifts, position-based colors, empty state onboarding.
- **Attendance** — clock in/out for the current user; managers can clock in others; "today on the floor" metrics on dashboard.
- **Announcements** — manager CRUD, staff read; dated posts surfaced on dashboard.
- **Shift Reassignment** — manager-only tool to reassign an existing shift to another employee (simplified swap flow).
- **Reports** — 30-day summary cards (total hours, attendance %) and per-employee breakdown table.

See the [Manager User Guide](./docs/05-USER-GUIDE.md) for detailed walkthroughs.

---

## Project Structure

Feature-first layout. Code that belongs to one feature lives next to it. Shared code lives in shared folders only after a second consumer exists.

```text
src/
  routes/                       # TanStack Start file-based routes
    __root.tsx                  # App shell (html/head/body)
    index.tsx                   # Public landing page (/)
    auth.tsx                    # Sign-in page (/auth)
    setup.tsx                   # First-manager bootstrap (/setup)
    _authenticated/             # Pathless layout — auth gate
      route.tsx                 # Redirects unauthenticated users to /auth
      dashboard.tsx
      staff.tsx
      staff.$userId.tsx
      schedule.tsx
      attendance.tsx
      announcements.tsx
      swaps.tsx
      reports.tsx
  features/
    staff/                      # Staff Directory feature
    schedule/                   # Weekly Schedule feature
  components/
    ui/                         # shadcn primitives
    layout/                     # AppShell, sidebar, mobile nav
  lib/
    auth/                       # Bootstrap server fns
    staff/                      # Staff CRUD server fns
    schedule/                   # Schedule server fns
    attendance/                 # Attendance server fns
    announcements/              # Announcements server fns
  integrations/
    supabase/                   # Auto-generated client + auth middleware
  styles.css
supabase/
  migrations/                   # SQL migrations (timestamped)
docs/                           # Project documentation (PRD, TRD, API, DB, guides)
```

**Rule:** route files stay thin — data loading + composing feature components. No business logic in routes.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (project uses `bun.lock`)
- Lovable Cloud project (auto-provisioned when you open the project in Lovable)

### Install & run

```bash
bun install
bun run dev
```

The dev server runs on `http://localhost:8080`.

### First-time setup

1. Visit `/setup` to create the first **manager** account.
2. The route locks itself after one manager exists.
3. Log in at `/auth`, then invite staff from `/staff`.

Staff accounts are **invite-only** — there is no public sign-up.

Full local-dev walkthrough in the [Developer Setup Guide](./docs/06-DEV-SETUP.md).

---

## Environment Variables

Public variables (safe in client bundles) — prefixed with `VITE_`:

| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Cloud project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |

Secrets used inside server functions only — never read at module scope, never in client code. Managed by Lovable Cloud secrets.

---

## Authentication & Roles

- **Provider:** Lovable Cloud Auth (email + password).
- **First manager:** created via the `/setup` bootstrap flow (locks after one exists).
- **Staff accounts:** invite-only. Managers create them from `/staff`; staff receive an invite link and set their own password.
- **Sessions:** JWT, SSR-safe via the project's auth middleware.
- **Roles:** stored in a separate `user_roles` table (never on `profiles`) and checked through a security-definer `has_role()` function — prevents recursive RLS and privilege-escalation bugs.

Two active roles today: `manager`, `staff`. `shift_lead` is reserved.

Permissions are enforced at three layers:
1. **UI** — hide actions the user cannot perform.
2. **Server functions** — `requireSupabaseAuth` + `has_role()` checks.
3. **Database** — explicit RLS policies and explicit `GRANT`s on every public table.

Full model in the [TRD](./docs/02-TRD.md) and [Database Reference](./docs/04-DATABASE.md).

---

## Database & Permissions

Core tables: `positions`, `profiles`, `user_roles`, `shifts`, `attendance`, `announcements`.

Conventions:

- All `public` tables have `GRANT` statements in the same migration that creates them.
- All `public` tables enable RLS and ship with explicit policies.
- Privileged mutations (invites, deletions, reassignments) flow through server functions using the admin client — never from the browser.

Migrations live in [`supabase/migrations/`](./supabase/migrations) and are timestamped. Every table, policy, grant, and security-definer function is documented in [`docs/04-DATABASE.md`](./docs/04-DATABASE.md).

---

## Development Standards

| Topic | Rule |
|---|---|
| Components | PascalCase, ~150 lines max, split when JSX has 3+ logical sections |
| Hooks | `use-kebab.ts` files, `useCamelCase` names |
| Server functions | `*.functions.ts`, client-safe import path |
| Server-only helpers | `*.server.ts` |
| DB tables | `snake_case`, plural |
| Colors | Semantic Tailwind tokens only (`bg-background`, `text-foreground`) — never `bg-[#fff]` |
| Validation | Zod at every server fn input and every form |
| Data loading | Loader + `useSuspenseQuery`, never `useEffect + fetch` |
| Mobile | Design and test at 360–414px first |
| Types | No `any` — use `unknown` and narrow |

Full contribution workflow in [`docs/06-DEV-SETUP.md`](./docs/06-DEV-SETUP.md).

---

## Roadmap

- [x] Project foundation (structure, stack, standards)
- [x] Auth shell (bootstrap + invite-only)
- [x] Staff Directory (CRUD, roles, positions, availability)
- [x] Weekly Schedule (prototype)
- [x] Attendance (clock in/out)
- [x] Announcements
- [x] Shift Reassignment
- [x] Reports (30-day summaries)
- [ ] Dedicated Staff Portal (self-service schedule + availability)
- [ ] Shift swap requests with approvals
- [ ] Draft-to-publish schedule workflow
- [ ] Payroll export
- [ ] In-app + email notifications
- [ ] PWA / push notifications
- [ ] Multi-restaurant support

---

## Contributing

This project is developed primarily inside Lovable with bidirectional GitHub sync. Changes pushed to `main` on GitHub sync into Lovable automatically, and vice versa.

When editing locally:

1. Match existing patterns — consistency beats cleverness.
2. Keep features self-contained under `src/features/<name>/`.
3. Add a migration for every schema change, with `GRANT`s and RLS policies in the same file.
4. Validate at the boundary with Zod.
5. Run `bun run dev` and verify the change in the browser before pushing.

See [`docs/06-DEV-SETUP.md`](./docs/06-DEV-SETUP.md) for the full contributor workflow.

---

**License:** Private — internal restaurant management tool.
