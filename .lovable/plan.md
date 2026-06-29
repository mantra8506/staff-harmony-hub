# Phase 2 — Development Foundation

Planning only. No features, no tables, no auth wiring. This locks the foundation decisions so Phase 3 (Staff Directory) can start cleanly.

---

## 1. Project Structure

Feature-first inside `src/`. Shared things live in shared folders; everything else lives next to the feature that owns it.

```text
src/
  routes/                 # TanStack Start file-based routes (pages only)
    __root.tsx
    index.tsx
    _authenticated/       # gated app shell (manager + staff views)
  features/               # one folder per business feature (added per phase)
    staff/                # Phase 3 will create this
      components/
      hooks/
      lib/                # pure logic (eligibility, formatting, etc.)
      types.ts
  components/
    ui/                   # shadcn primitives (do not edit casually)
    layout/               # app shell, nav, mobile bottom bar
  hooks/                  # cross-feature hooks only
  lib/                    # cross-feature utils (date, formatters, guards)
  integrations/
    supabase/             # cloud client + auth middleware (when enabled)
  styles.css
```

Rule: if code is used by **one** feature, it lives in `features/<name>/`. Promote to `components/`, `hooks/`, or `lib/` only when a second feature needs it.

## 2. Technology Stack (confirmed)

| Tech | Role | Why |
|---|---|---|
| **Lovable** | Build + hosting platform | Where this project lives; manages preview, publish, Cloud. |
| **TanStack Start (React 19 + Vite 7)** | App framework | Already the template; SSR-capable, file-based routing, type-safe links. |
| **TypeScript (strict)** | Language | Catches bugs early; required by template. |
| **Tailwind CSS v4** | Styling | Mobile-first utilities, design tokens via CSS vars. |
| **shadcn/ui + Radix** | UI primitives | Accessible, unstyled-by-default, owned in-repo. |
| **TanStack Query** | Server state | Caching, loaders, invalidation — already wired. |
| **TanStack Router** | Routing + nav | Type-safe routes, loader-driven data. |
| **Lovable Cloud (Supabase)** | DB + Auth + Storage + Functions | One backend, no external accounts. Enable in Phase 3. |
| **Lovable AI Gateway** | Optional later | Only if we add smart scheduling, summaries, etc. Not now. |
| **Zod** | Validation | Single source of truth for input shape (client + server fn). |
| **Sonner** (toasts) | User feedback | Already present via shadcn. |

Deferred until needed: testing framework, Storybook, i18n library, push-notification SDK, analytics. We add them when a real need appears.

## 3. Environment Configuration

Three logical environments, all managed by Lovable:

- **Development** — the live preview while editing. Uses the dev Cloud project.
- **Preview / staging** — the published preview URL (`project--<id>-dev.lovable.app`). Same Cloud project as dev for now.
- **Production** — the published URL. Same Cloud project for MVP; we split later only if needed.

Config rules:
- Public config: `import.meta.env.VITE_*`.
- Secrets: stored via Lovable Cloud secrets, read inside server function `.handler()` only.
- No `.env` files committed. No secrets in client bundles.
- A second Cloud project for production is a Phase 7+ decision, not now.

## 4. Authentication Strategy (discussion only)

Provider: Lovable Cloud Auth (Supabase under the hood).

- **Manager sign-in**: email + password. First manager is created during initial setup (seed or self-signup that we then promote to manager role).
- **Staff accounts**: **invite-only**. Manager enters staff name + email/phone, system sends an invite link (email for MVP). Staff clicks link, sets password, lands in their mobile dashboard.
- **Invitation flow**: token-based, single-use, expires in 7 days. Resendable. Staff who haven't accepted show as "Pending" in the directory.
- **Password reset**: standard email reset link via Cloud Auth.
- **Sessions**: Cloud-managed JWT; SSR-safe via the project's auth middleware.
- **Roles** stored in a separate `user_roles` table (per platform rule) — never on the profile. Roles: `manager`, `staff`, future `shift_lead`.
- **Multi-restaurant future**: every domain row will eventually carry a `restaurant_id`; users will have a membership row per restaurant with a role. We **don't model this now**, but we keep the door open by:
  - Never hardcoding "the restaurant" into UI copy as if it's the only one.
  - Putting role checks behind a `useCurrentRole()` hook rather than reading from raw tables.
- Phone-only login, magic links, social login: **deferred**.

Not building any of this in Phase 2.

## 5. File Organization Rules

- One feature = one folder in `features/`.
- A feature owns its components, hooks, server functions (`*.functions.ts`), and types.
- Cross-feature primitives only move into `components/`, `hooks/`, or `lib/` after a real second use.
- Route files in `src/routes/` stay thin: data loading + composing feature components. No business logic in route files.
- Server-only code uses the `*.server.ts` / `*.functions.ts` split per template rules.

## 6. Naming Standards

| Thing | Convention | Example |
|---|---|---|
| Component files | `PascalCase.tsx` | `StaffList.tsx` |
| Component names | PascalCase | `StaffList` |
| Hook files | `use-kebab.ts` | `use-current-role.ts` |
| Hook names | `useCamelCase` | `useCurrentRole` |
| Route files | TanStack flat dot convention | `staff.$staffId.tsx` |
| Util / lib files | `kebab-case.ts` | `format-shift-time.ts` |
| Server fn files | `<name>.functions.ts` | `staff.functions.ts` |
| Server-only helpers | `<name>.server.ts` | `staff.server.ts` |
| Types files | `types.ts` per feature; shared types in `src/types/` only if reused |  |
| Variables / functions | `camelCase` |  |
| Constants | `SCREAMING_SNAKE_CASE` for true constants only |  |
| Booleans | `is/has/can` prefix | `isPublished`, `canEditSchedule` |
| Event handlers | `handleX` inside component, `onX` as prop | `handleSubmit`, `onSelect` |
| DB tables | `snake_case`, plural | `staff_members`, `shift_assignments` |
| DB columns | `snake_case` | `created_at`, `primary_position_id` |
| DB enums | `snake_case` type, lowercase values | `app_role` → `manager`, `staff` |
| Migrations | timestamped, descriptive | `2026_06_29_create_staff_members.sql` |

Rule: consistency beats cleverness. If unsure, match what's already in the file.

## 7. Permissions Strategy (high level)

Three actors, three layers of enforcement:

| Actor | Can | Cannot |
|---|---|---|
| **Manager** | Everything in their restaurant | Touch platform-level config |
| **Shift Lead** *(future)* | View full schedule, approve swaps, mark attendance | Edit pay, manage roles |
| **Staff** | See own data, request swaps/time off, view announcements | See other staff's personal info or pay |

Enforcement layers (defense in depth):
1. **UI** — hide actions the user can't perform (`useCurrentRole`).
2. **Server functions** — every mutating server fn checks role via `requireSupabaseAuth` + a `has_role()` SQL function.
3. **Database RLS** — every public table has explicit RLS policies and explicit `GRANT`s. Roles live in `user_roles`, checked via security-definer function (never recursive).

We design tables for this from Phase 3 onward — no policies in Phase 2.

## 8. Error Handling Philosophy

- **Validation**: Zod schema is the contract. Same schema feeds client form + server `.inputValidator()`. Never validate twice with different rules.
- **User-facing errors**: short, plain language, actionable. Toast via Sonner for transient, inline message for form fields, full-page error boundary for route failures. No raw stack traces, no DB error codes, no jargon.
- **Boundaries**: every route with a loader sets `errorComponent` and `notFoundComponent`. Root sets a fallback. Already wired in `__root.tsx`.
- **Logging**: client errors go through the existing `reportLovableError`. Server function errors logged server-side; never leak internal messages to the client — return a sanitized error.
- **Unexpected failures**: fail closed (deny), show "Something went wrong, try again", offer retry. Never silently swallow.
- **Network**: TanStack Query handles retries with sensible defaults; mutations don't auto-retry.

## 9. Notifications Strategy (plan only)

Tiered, simplest-first:

- **MVP (Phase 3–4)**: in-app notification center (bell icon + list). Backed by a `notifications` table. Manager and staff get items like "swap request from X", "schedule published".
- **Phase 4–5**: email notifications for schedule published, swap approved/denied, time-off decisions. Sent via Lovable Cloud (custom email later).
- **Future**: push notifications (PWA web push first, native later). Requires PWA install and permission flow — defer until staff actually ask for it.
- **Never (MVP)**: SMS, WhatsApp — cost + compliance overhead not justified for <15 staff.

User preference: each user can toggle email per notification category (parked for Phase 6).

## 10. Coding Principles

1. **Mobile-first**: design and test at 360–414px first, scale up.
2. **Keep components small**: ~150 lines max; split when JSX has 3+ logical sections.
3. **Separate logic from UI**: pure functions in `lib/`, data in hooks, presentation in components.
4. **No duplicate logic**: extract on the second occurrence, not the first.
5. **One feature at a time**: finish, test, ship before starting the next.
6. **Type everything**: no `any`. Use `unknown` and narrow.
7. **Validate at the boundary**: Zod at every server fn input and every form.
8. **Tokens not hex**: only semantic Tailwind tokens (`bg-background`, `text-foreground`), never `bg-[#fff]`.
9. **Accessible by default**: shadcn primitives, real `<button>`/`<a>`, alt text, focus states, keyboard reachable.
10. **Loader > useEffect for data**: TanStack Query in loaders, `useSuspenseQuery` in components.
11. **Server fns for mutations**: never call Supabase admin from the browser.
12. **Small commits per feature step**: easier to review and roll back.

---

## Risks to Avoid

- **Premature multi-tenant modeling** — adds complexity now for a future we may never reach. Keep single-restaurant for MVP, design API surfaces so a `restaurant_id` can be added later without UI churn.
- **Auth before structure** — building auth without role architecture leads to recursive RLS and rewrites. We follow the `user_roles` + `has_role()` pattern from day one.
- **Storing roles on profile table** — security risk; forbidden.
- **Mixing route files with business logic** — makes routes hard to test and reuse.
- **Skipping mobile testing** — managers may be on desktop but staff are 100% on phones.
- **Over-investing in tooling** (Storybook, e2e, monorepo) before there's pain.
- **Hardcoded copy in UI assuming single restaurant** — makes future expansion painful.
- **Notification overload** — defaulting every event to email will train staff to ignore them.

## Ready-for-Phase-3 Checklist

- [x] Folder structure rule decided (feature-first under `src/features/`).
- [x] Stack confirmed; no surprise dependencies needed.
- [x] Naming conventions documented.
- [x] Auth approach decided (Cloud Auth, invite-only staff, manager email/password, roles in separate table).
- [x] Permission model decided (3 roles, 3 enforcement layers).
- [x] Error + notification philosophies set.
- [x] Coding principles agreed.
- [ ] **Lovable Cloud enabled** (do at the start of Phase 3, not before — nothing in Phase 2 needs it).
- [ ] First manager account creation flow decided (self-signup + promote, vs seeded). → confirm in Phase 3 kickoff.
- [ ] Region / labor-rule answers from Phase 1 open questions (still pending) — needed before scheduling phase, not staff directory.

## Next Planning Step

Phase 3 kickoff: **Staff Directory**. We'll decide exact staff fields, the availability model, invitation UX, and the minimum data the scheduler will need from a staff record. At the start of Phase 3 we enable Lovable Cloud and create the `user_roles` + `profiles` + `staff_members` tables (planning first, then implementing).
