# Technical Requirements Document (TRD)

**Product:** Staff Harmony Hub
**Pilot Deployment:** Station 31 Restaurant & Bar
**Document Version:** 1.0
**Status:** Prototype — Manager Portal near-complete, Staff Portal planned
**Last Updated:** Day 5 — Documentation Sprint
**Companion To:** `docs/01-PRD.md`

---

## Table of Contents

- [1. Purpose & Scope](#1-purpose-scope)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Technology Stack](#3-technology-stack)
- [4. Project Structure](#4-project-structure)
- [5. Data Model](#5-data-model)
- [6. Authentication & Authorization](#6-authentication-authorization)
- [7. Module Contracts](#7-module-contracts)
- [8. Client Data Flow](#8-client-data-flow)
- [9. Routing Map](#9-routing-map)
- [10. Non-Functional Requirements](#10-non-functional-requirements)
- [11. Build, Deploy & Environments](#11-build-deploy-environments)
- [12. Coding Standards](#12-coding-standards)
- [13. Known Technical Debt & Deferred Work](#13-known-technical-debt-deferred-work)
- [14. Traceability to PRD](#14-traceability-to-prd)

---

## 1. Purpose & Scope

This document translates the Product Requirements Document (PRD) into a concrete technical specification for the current prototype of Staff Harmony Hub. It defines the runtime architecture, data model, security model, module-level contracts, and non-functional constraints that the codebase currently implements.

Scope is limited to what is shipped in the prototype:

- Manager Portal (Staff Directory, Weekly Schedule, Attendance, Announcements, Shift Reassignment, Reports).
- Invite-only authentication for Manager and Staff roles.
- Single-tenant deployment for one restaurant (Station 31).

Out of scope for this TRD: Staff-facing portal features, payroll integrations, POS integrations, multi-location tenancy.

---

## 2. Architecture Overview

Staff Harmony Hub is a full-stack React application built on **TanStack Start v1** running on an edge runtime (Cloudflare Workers), backed by **Lovable Cloud** (managed Postgres, Auth, and Storage).

```text
┌────────────────────────────────────────────────────────────┐
│                     Browser (React 19)                      │
│   TanStack Router · TanStack Query · shadcn/ui · Tailwind   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
     Server Functions (RPC)          Auth Session (Supabase JS)
               │                              │
┌──────────────▼──────────────────────────────▼───────────────┐
│           TanStack Start SSR / Edge Runtime                 │
│   createServerFn handlers · requireSupabaseAuth middleware  │
└──────────────┬──────────────────────────────┬───────────────┘
               │ Publishable key + user JWT   │ Service role
               │       (RLS enforced)         │ (admin ops)
┌──────────────▼──────────────────────────────▼───────────────┐
│                       Lovable Cloud                          │
│   Postgres · Row Level Security · Auth · Storage             │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Runtime Layers

| Layer | Responsibility |
|-------|----------------|
| **Client (browser)** | UI rendering, form state, optimistic updates, session management via Supabase JS. |
| **Server Functions** | Typed RPC (`createServerFn`) for all app-internal reads/writes. Enforce authorization and validation. |
| **Edge Runtime** | Serves SSR + server functions. Cloudflare Workers with `nodejs_compat`. |
| **Database** | Postgres with RLS policies as the last line of defense. |

---

## 3. Technology Stack

| Concern | Choice | Notes |
|--------|--------|-------|
| Framework | TanStack Start v1 (React 19, Vite 7) | File-based routing under `src/routes/`. |
| Language | TypeScript (strict) | Zero `any` in shared contracts. |
| Styling | Tailwind CSS v4 | Semantic tokens in `src/styles.css`. |
| UI Library | shadcn/ui + Radix primitives | Accessible components; themed via CSS variables. |
| Data Fetching | TanStack Query v5 | `ensureQueryData` in loaders, `useSuspenseQuery` in components. |
| Forms | React Hook Form + Zod | Validation at every server-function boundary. |
| Backend | Lovable Cloud (Supabase) | Postgres + Auth + RLS. |
| Auth | Supabase Auth (email/password, invite-only) | Session in `localStorage`; bearer token attached to server fns. |
| Icons | lucide-react | |
| Toasts | sonner | |
| Hosting | Lovable / Cloudflare Workers | Preview + published environments. |

---

## 4. Project Structure

Feature-first layout under `src/`:

```text
src/
├── routes/                      # File-based routes (TanStack Router)
│   ├── __root.tsx               # HTML shell, head, providers
│   ├── index.tsx                # Public landing page
│   ├── auth.tsx                 # Sign-in
│   ├── setup.tsx                # One-time manager bootstrap
│   └── _authenticated/          # Gated layout (redirects to /auth)
│       ├── route.tsx            # Auth gate
│       ├── dashboard.tsx
│       ├── staff.tsx
│       ├── staff.$userId.tsx
│       ├── schedule.tsx
│       ├── attendance.tsx
│       ├── announcements.tsx
│       ├── swaps.tsx
│       └── reports.tsx
├── features/                    # UI + query options per domain
│   ├── staff/
│   ├── schedule/
│   ├── swaps/
│   └── operations/              # Announcements + Attendance queries
├── lib/                         # Server-function modules
│   ├── auth/bootstrap.functions.ts
│   ├── staff/staff.functions.ts
│   ├── schedule/schedule.functions.ts
│   ├── attendance/attendance.functions.ts
│   ├── announcements/announcements.functions.ts
│   └── swaps/{swaps,reassign}.functions.ts
├── components/layout/AppShell.tsx
├── hooks/use-current-user.ts
└── integrations/supabase/       # Auto-generated clients + middleware
```

Rules the codebase enforces:

- Server functions live in `*.functions.ts` files, importable from the client (only handler bodies are stripped at build).
- Modules that use the service-role admin client live in `*.server.ts` and are dynamically imported inside handlers to prevent client bundling.
- Route files never call service-role code directly.

---

## 5. Data Model

All application tables live in the `public` schema. Every table has RLS enabled and explicit `GRANT`s.

### 5.1 Enums

| Enum | Values |
|------|--------|
| `app_role` | `manager`, `shift_lead`, `staff` |
| `staff_status` | `active`, `inactive` |
| `schedule_status` | `draft`, `published` *(reserved; prototype does not lock weeks)* |
| `swap_status` | `pending`, `approved`, `rejected`, `cancelled` *(reserved)* |

### 5.2 Tables

**`positions`** — canonical roles (Server, Bartender, Cook, etc.).
- `id uuid pk`, `name text`, `department text`, `sort_order int`, `created_at`.

**`profiles`** — one row per staff member; `id` mirrors `auth.users.id`.
- `id uuid pk` (FK to auth.users)
- `employee_code text` (auto-generated `S###` sequence)
- `full_name text`, `phone text` (unique when set)
- `primary_position_id uuid → positions.id`
- `secondary_position_ids uuid[]`
- `availability jsonb` (per-day array of shift keys: `morning|afternoon|evening`)
- `max_hours_per_week int`, `notes text`
- `status staff_status` (default `active`)
- `invited_at`, `invite_expires_at`
- `created_at`, `updated_at`

**`user_roles`** — role assignments (never on profiles for security).
- `id uuid pk`, `user_id uuid`, `role app_role`, `unique(user_id, role)`.

**`shifts`** — scheduled work assignments.
- `id`, `employee_id → profiles.id`, `position_id → positions.id`
- `work_date date`, `start_time time`, `end_time time`
- `break_minutes int` (default 0)
- `notes text`, `created_by uuid`, timestamps.

**`schedule_weeks`** — reserved for future publish/lock workflow.
- `week_start date pk`, `status`, `published_at`, `published_by`.

**`shift_swap_requests`** — reserved for a future staff-driven swap flow. In the current prototype, swaps are handled as direct manager reassignment of a shift's `employee_id`.

**`announcements`** — manager-authored posts visible to all staff.
- `id`, `title`, `description`, `event_date`, `created_by`, timestamps.

**`attendance`** — clock-in / clock-out records.
- `id`, `employee_id → profiles.id`, `work_date date`
- `clock_in_at timestamptz` (default `now()`), `clock_out_at timestamptz nullable`
- timestamps.

### 5.3 Security-Definer Functions

- `public.has_role(_user_id uuid, _role app_role) returns boolean` — used by every RLS policy to avoid recursion.
- `public.any_manager_exists() returns boolean` — powers the `/setup` bootstrap flow (blocks it once a manager exists).

### 5.4 RLS & Grants Pattern

Every public table follows the mandated pattern:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
-- Policies use has_role(auth.uid(), 'manager') for privileged writes.
```

Anonymous role has no grants on any application table. All data access requires an authenticated session.

---

## 6. Authentication & Authorization

### 6.1 Session Model

- **Provider:** Supabase Auth (email + password).
- **Sign-up path:** Invite-only. Managers create staff via `inviteStaff`, which uses the admin API to provision an auth user and a `profiles` row. Public sign-ups are disabled.
- **Bootstrap:** `/setup` is accessible only while `any_manager_exists()` returns `false`. It creates the first manager account and role assignment.
- **Session storage:** Browser `localStorage` via the Supabase JS client (`src/integrations/supabase/client.ts`).

### 6.2 Server-Function Authorization

- All app-internal writes use `createServerFn(...).middleware([requireSupabaseAuth])`.
- The middleware validates the bearer token and injects `{ supabase, userId, claims }` on `context`.
- Manager-only operations re-check the role using `has_role(userId, 'manager')` inside the handler before performing privileged work.
- `src/start.ts` registers a client-side `functionMiddleware` that attaches the Supabase bearer token to every server-function call.

### 6.3 Three-Tier Permission Enforcement

1. **UI gate** — `_authenticated/route.tsx` redirects unauthenticated visitors to `/auth`; role-conditional UI hides manager-only actions.
2. **Server function** — middleware + explicit role checks reject unauthorized calls with HTTP 401/403.
3. **Database RLS** — final defense; even a bypassed client cannot read/write outside policy.

### 6.4 Admin Operations

Privileged operations that require bypassing RLS (creating auth users, resending invites, cancelling invites, banning inactive accounts) use `supabaseAdmin` from `src/integrations/supabase/client.server.ts`, dynamically imported inside handlers:

```ts
const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
```

The service-role key never reaches the client bundle.

---

## 7. Module Contracts

Each feature exposes a small, typed server-function surface. Zod validators run before every handler.

### 7.1 Staff Directory (`src/lib/staff/staff.functions.ts`)

| Function | Method | Auth | Description |
|---------|--------|------|-------------|
| `listStaff` | GET | authenticated | Returns all profiles with joined position names, role list, and computed invite status. |
| `inviteStaff` | POST | manager | Creates auth user + profile; assigns role; sets invite window. |
| `updateStaff` | POST | manager | Updates profile fields; validates unique phone; syncs `banned_until` on deactivation. |
| `resendInvite` | POST | manager | Resends the invite email via admin API. |
| `cancelInvite` | POST | manager | Deletes the pending auth user + profile. |
| `removeStaff` | POST | manager | Soft-deactivates (status = inactive) and bans the auth account. |

### 7.2 Schedule (`src/lib/schedule/schedule.functions.ts`)

| Function | Method | Auth | Description |
|---------|--------|------|-------------|
| `listShifts` | GET | authenticated | Shifts for a `week_start` (7-day window). |
| `createShift` | POST | manager | Insert a shift; validates start < end and known employee/position. |
| `updateShift` | POST | manager | Edit an existing shift. |
| `deleteShift` | POST | manager | Remove a shift. |

### 7.3 Attendance (`src/lib/attendance/attendance.functions.ts`)

| Function | Method | Auth | Description |
|---------|--------|------|-------------|
| `listTodayAttendance` | GET | authenticated | Today's open + closed sessions with employee names. |
| `clockIn` | POST | manager (or self) | Creates an attendance row for today. |
| `clockOut` | POST | manager (or self) | Sets `clock_out_at = now()` on the open row. |

### 7.4 Announcements (`src/lib/announcements/announcements.functions.ts`)

| Function | Method | Auth | Description |
|---------|--------|------|-------------|
| `listAnnouncements` | GET | authenticated | All announcements, newest first. |
| `createAnnouncement` | POST | manager | Insert a new post. |
| `updateAnnouncement` | POST | manager | Edit title/description/event date. |
| `deleteAnnouncement` | POST | manager | Remove a post. |

### 7.5 Shift Reassignment (`src/lib/swaps/reassign.functions.ts`)

| Function | Method | Auth | Description |
|---------|--------|------|-------------|
| `reassignShift` | POST | manager | Updates a shift's `employee_id` to a new active staff member. |

### 7.6 Reports (client-side aggregation)

The prototype computes reports (total scheduled hours, attendance %, per-employee breakdown for the last 30 days) client-side from `listShifts` + attendance queries. No dedicated server function exists yet.

---

## 8. Client Data Flow

The canonical pattern for every authenticated page:

```ts
// features/<domain>/queries.ts
export const staffListOptions = queryOptions({
  queryKey: ["staff", "list"],
  queryFn: () => listStaff(),
});

// routes/_authenticated/staff.tsx
export const Route = createFileRoute("/_authenticated/staff")({
  loader: ({ context }) => context.queryClient.ensureQueryData(staffListOptions),
  component: StaffPage,
});

function StaffPage() {
  const { data } = useSuspenseQuery(staffListOptions);
  // ...
}
```

Mutations use `useMutation` + `queryClient.invalidateQueries` on success. Optimistic updates are only applied for latency-sensitive interactions (e.g., attendance clock in/out).

---

## 9. Routing Map

| Path | Access | Purpose |
|------|--------|---------|
| `/` | Public | Marketing landing page. |
| `/auth` | Public | Sign-in. |
| `/setup` | Public (only while no manager exists) | First-manager bootstrap. |
| `/dashboard` | Authenticated | Manager home with metrics and quick actions. |
| `/staff` | Authenticated (manager UI) | Staff directory. |
| `/staff/$userId` | Authenticated | Staff detail view. |
| `/schedule` | Authenticated | Weekly schedule grid. |
| `/attendance` | Authenticated | Today's floor + clock in/out. |
| `/announcements` | Authenticated | Posts (manager CRUD, staff read). |
| `/swaps` | Authenticated (manager) | Direct shift reassignment. |
| `/reports` | Authenticated (manager) | 30-day summary. |

---

## 10. Non-Functional Requirements

### 10.1 Performance

- Initial route TTI on a mid-range mobile connection: target **< 2.5s**.
- List queries return **< 500ms** at prototype scale (< 15 staff, < 200 shifts/week).
- All authenticated routes preload data in loaders — no `useEffect`-based initial fetch.

### 10.2 Security

- All sensitive keys are server-only (`process.env` inside handlers).
- Publishable Supabase key is safe in the client bundle; service-role key is never bundled.
- Roles are stored exclusively in `user_roles` (never on `profiles`) to prevent privilege escalation.
- RLS is enabled on every application table with explicit policies.

### 10.3 Accessibility

- Semantic HTML, single `<h1>` per route, ARIA labels on icon-only buttons.
- All Radix primitives keyboard-navigable by default.
- Colour tokens meet WCAG AA contrast on both themes.

### 10.4 Responsiveness

- Mobile-first (breakpoint baseline 375px).
- Schedule, staff, and attendance views ship distinct mobile layouts (cards / single-day views) alongside desktop grids/tables.
- App shell provides bottom navigation on small screens and a sidebar on desktop.

### 10.5 Reliability & Observability

- Every route defines `errorComponent` and `notFoundComponent`; the root defines `notFoundComponent`.
- Errors surface via `sonner` toasts and are logged to the console.
- No production analytics or telemetry are wired in the prototype (deferred).

### 10.6 Browser Support

- Latest two versions of Chrome, Safari, Edge, and Firefox. iOS Safari 16+.

---

## 11. Build, Deploy & Environments

| Environment | URL Pattern | Purpose |
|-------------|-------------|---------|
| Preview | `id-preview--<id>.lovable.app` | Live preview per change. |
| Published | Assigned on publish | User-facing deployment. |

- **Build:** Vite 7 via TanStack Start plugin; SSR entry generated automatically.
- **Runtime:** Cloudflare Workers with `nodejs_compat`; only Worker-safe npm packages allowed.
- **Config:** Environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (client + SSR); service-role key is injected server-side by Lovable Cloud.
- **Migrations:** SQL migrations under `supabase/migrations/` are applied via the platform migration tool. Every table create ships with `GRANT`s + RLS in the same migration.

---

## 12. Coding Standards

- TypeScript strict; no implicit `any`.
- Zod schemas at every server-function boundary; shared types re-exported from `src/features/<domain>/types.ts`.
- Business logic isolated from UI (server functions + typed query options; components render only).
- Components under ~200 lines; extract when they grow.
- Semantic Tailwind tokens only — no hard-coded colours (`bg-[#...]`, `text-white`).
- Imports use the `@/*` alias for `src/*`.

---

## 13. Known Technical Debt & Deferred Work

| Area | Item | Rationale |
|------|------|-----------|
| Schedule | `schedule_weeks` publish/lock workflow is defined at the schema level but not enforced in UI. | Simplified per prototype scope. |
| Swaps | `shift_swap_requests` table exists but the current UI uses direct manager reassignment only. | Staff Portal work will re-enable it. |
| Reports | Aggregations run client-side. | Move to a dedicated server function once volume grows. |
| Auth | Google OAuth not enabled. | Email/password sufficient for pilot. |
| Notifications | No email/push notifications on invite events beyond Supabase defaults. | Planned with Staff Portal. |
| Observability | No structured server logs or error tracking. | Add before broader rollout. |
| Testing | No automated test suite in the prototype. | Add unit tests for server functions before production. |

---

## 14. Traceability to PRD

| PRD Requirement | Implementation |
|----------------|----------------|
| Staff Directory (FR-1) | Section 5.2 `profiles`, Section 7.1. |
| Weekly Schedule (FR-2) | Section 5.2 `shifts`, Section 7.2. |
| Attendance (FR-3) | Section 5.2 `attendance`, Section 7.3. |
| Announcements (FR-4) | Section 5.2 `announcements`, Section 7.4. |
| Shift Reassignment (FR-5) | Section 7.5. |
| Reports (FR-6) | Section 7.6. |
| Role-based access | Sections 5.3, 6.2, 6.3. |
| Mobile-first UX | Section 10.4. |
| Invite-only auth | Sections 6.1, 7.1. |

---

**End of Document.** Next in the documentation sprint: `docs/03-API.md` (API / Server Function Reference).
