# Restaurant Staff Management System

A mobile-first staff management platform for small-to-mid sized restaurants. Built to help managers handle their team — directory, scheduling, attendance, and communication — without enterprise-grade complexity.

> **Status:** Phase 3 in progress — Foundation + Staff Directory. Scheduling, attendance, payroll, and communications are planned for later phases.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Authentication Model](#authentication-model)
7. [Database & Permissions](#database--permissions)
8. [Development Standards](#development-standards)
9. [Roadmap](#roadmap)
10. [Risks & Things to Avoid](#risks--things-to-avoid)
11. [Contributing](#contributing)

---

## Overview

This project is being built in **deliberate, professional phases** rather than rushed all at once.

| Phase | Focus | Status |
|---|---|---|
| 1 | Product discovery & requirements | Complete |
| 2 | Development foundation (structure, stack, standards) | Complete |
| 3 | **Staff Directory + Auth** | **In progress** |
| 4 | Scheduling | Planned |
| 5 | Attendance & time tracking | Planned |
| 6 | Notifications & communication | Planned |
| 7 | Multi-restaurant support | Future |

The full Phase 2 planning doc lives in [`.lovable/plan.md`](./.lovable/plan.md).

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
| **Lovable Cloud** (Supabase) | Database, Auth, Storage, server functions |
| **Zod** | Schema validation (client + server) |
| **Sonner** | Toast notifications |

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
      dashboard.tsx             # /dashboard
      staff.tsx                 # /staff
  features/
    staff/                      # Staff Directory feature
      components/
      queries.ts
      types.ts
  components/
    ui/                         # shadcn primitives
    layout/                     # AppShell, navigation
  hooks/                        # Cross-feature hooks
  lib/
    auth/
      bootstrap.functions.ts    # First-manager creation
    staff/
      staff.functions.ts        # Staff CRUD server functions
  integrations/
    supabase/                   # Auto-generated client + auth middleware
  styles.css
supabase/
  migrations/                   # SQL migrations (timestamped)
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

## Authentication Model

- **Provider:** Lovable Cloud Auth (email + password).
- **First manager:** created via the `/setup` bootstrap flow (locks after one exists).
- **Staff accounts:** invite-only. Managers create them from `/staff`; staff receive an invite link and set their own password.
- **Sessions:** JWT, SSR-safe via the project's auth middleware.
- **Roles:** stored in a separate `user_roles` table (never on `profiles`) and checked through a security-definer `has_role()` function — prevents recursive RLS and privilege-escalation bugs.

Three roles: `manager`, `shift_lead` (future), `staff`.

Permissions are enforced at three layers:
1. **UI** — hide actions the user cannot perform.
2. **Server functions** — `requireSupabaseAuth` + `has_role()` checks.
3. **Database** — explicit RLS policies and explicit `GRANT`s on every public table.

---

## Database & Permissions

Phase 3 schema:

- `app_role` enum: `manager | shift_lead | staff`
- `positions` — restaurant positions (server, bartender, etc.)
- `profiles` — per-user profile data (full name, phone, primary position)
- `user_roles` — `(user_id, role)` pairs, the **only** source of truth for roles

Conventions:

- All `public` tables have `GRANT` statements in the same migration that creates them.
- All `public` tables enable RLS and ship with explicit policies.
- Privileged mutations (invites, deletions) flow through server functions using the admin client — never from the browser.

Migrations live in [`supabase/migrations/`](./supabase/migrations) and are timestamped.

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

Full standards in [`.lovable/plan.md`](./.lovable/plan.md).

---

## Roadmap

- [x] Project foundation (structure, stack, standards)
- [x] Auth shell (bootstrap + invite-only)
- [x] Staff Directory (CRUD, roles, positions)
- [ ] Scheduling (shift assignments, publishing, swap requests)
- [ ] Attendance (clock in/out, late tracking)
- [ ] In-app notification center
- [ ] Email notifications for key events
- [ ] PWA / push notifications
- [ ] Multi-restaurant support

---

## Risks & Things to Avoid

- **Premature multi-tenant modeling** — single-restaurant for MVP; design API surfaces so `restaurant_id` can be added later without UI churn.
- **Storing roles on the profile table** — security risk; forbidden. Roles live in `user_roles`.
- **Recursive RLS** — always use the `has_role()` security-definer function in policies.
- **Skipping mobile testing** — staff are 100% on phones.
- **Notification overload** — defaulting every event to email trains staff to ignore them.
- **Business logic in route files** — keep routes thin.

---

## Contributing

This project is developed primarily inside Lovable with bidirectional GitHub sync. Changes pushed to `main` on GitHub sync into Lovable automatically, and vice versa.

When editing locally:

1. Match existing patterns — consistency beats cleverness.
2. Keep features self-contained under `src/features/<name>/`.
3. Add a migration for every schema change, with `GRANT`s and RLS policies in the same file.
4. Validate at the boundary with Zod.
5. Run `bun run dev` and verify the change in the browser before pushing.

---

**License:** Private — internal restaurant management tool.
