# Developer Setup & Contribution Guide

**Product:** Staff Harmony Hub
**Audience:** Engineers contributing to the codebase
**Document Version:** 1.0
**Status:** Prototype
**Companion To:** `docs/02-TRD.md`, `docs/03-API.md`, `docs/04-DATABASE.md`

---

## 1. Overview

Staff Harmony Hub is a **TanStack Start** (React 19, Vite 7) application backed by **Lovable Cloud** (managed Supabase). This guide covers how to run the project, how the code is laid out, the workflows for adding features and schema changes, coding standards, and how to open a change for review.

Read this alongside the TRD (`docs/02-TRD.md`) for architecture and the API/DB references for module contracts.

---

## 2. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Only for local tooling if editing outside Lovable. |
| Bun | latest | Package manager used by the project (`bunfig.toml`, `bun.lockb`). |
| Git | 2.40+ | For GitHub sync / local development. |
| A modern browser | Chrome / Edge / Safari / Firefox (latest 2 versions) | |

Lovable Cloud is the default backend. There is no local Postgres to run — the dev app talks to the managed instance.

---

## 3. Working in Lovable (Recommended)

Most contributors work directly in the Lovable editor, which handles the dev server, package installs, database migrations, and preview URLs.

1. Open the project at `https://lovable.dev/projects/<project-id>`.
2. Use chat to request changes. The agent edits files, runs migrations, and hot-reloads the preview.
3. Live preview: `https://id-preview--<project-id>.lovable.app`.
4. **Publish** from the editor to promote the current preview to the published URL.

Version history is available in the editor for point-in-time restore. See the platform docs for GitHub sync, rollback, and collaboration.

---

## 4. Working Locally via GitHub Sync

For engineers who prefer an IDE:

1. In the Lovable editor: **+ menu → GitHub → Connect project**, then **Create Repository**.
2. Clone the repo:
   ```bash
   git clone git@github.com:<org>/<repo>.git
   cd <repo>
   bun install
   ```
3. Copy environment variables (see §5).
4. Start the dev server:
   ```bash
   bun run dev
   ```
5. Open `http://localhost:8080`.

Two-way sync is real-time: commits pushed to GitHub appear in Lovable, and edits in Lovable are pushed back automatically.

**Do not** run stateful `git` commands from within the Lovable sandbox — Git state is managed by the platform.

---

## 5. Environment Variables

The Lovable sandbox and preview environments have these injected automatically. For local IDE work, populate a `.env.local`.

### Client-visible (browser + SSR)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) API key. Safe in the client bundle. |
| `VITE_SUPABASE_PROJECT_ID` | Optional; used by tooling. |

### Server-only

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Same URL, read via `process.env` inside server functions. |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key, server-side. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. **Never** bundled in the client; only read inside `*.server.ts` files. |
| `LOVABLE_API_KEY` | Reserved for Lovable AI Gateway and connector calls. |

**Rules:**

- Never rename service keys to `VITE_*`.
- Never read secrets at module scope in shared files — read them inside a handler.
- Never log or echo secret values.

---

## 6. Project Layout

```text
src/
├── routes/                     # File-based routing (TanStack Router)
│   ├── __root.tsx              # HTML shell + head + providers
│   ├── index.tsx               # Public landing
│   ├── auth.tsx
│   ├── setup.tsx
│   └── _authenticated/         # Auth-gated subtree
├── features/                   # UI + query options per domain
│   ├── staff/
│   ├── schedule/
│   ├── swaps/
│   └── operations/
├── lib/                        # Server functions (RPC)
│   ├── auth/
│   ├── staff/
│   ├── schedule/
│   ├── attendance/
│   ├── announcements/
│   └── swaps/
├── components/                 # UI primitives, layout, shared bits
├── hooks/
├── integrations/supabase/      # Auto-generated clients + middleware
├── styles.css                  # Tailwind v4 tokens + globals
├── router.tsx
├── server.ts
└── start.ts
supabase/
└── migrations/                 # SQL migrations (via platform tool)
docs/                           # This documentation sprint
.workspace/                     # Skills (managed)
```

Key rules:

- **No `src/pages/`** — this is TanStack Start, not Next.js.
- **`*.functions.ts`** contains `createServerFn` definitions; client-safe to import.
- **`*.server.ts`** contains admin/service-role code; dynamically imported inside handlers only.
- **Feature UI + query options** live under `src/features/<domain>/`.
- **Never edit** `src/routeTree.gen.ts` or files under `src/integrations/supabase/` — they are auto-generated.

---

## 7. Common Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start the local dev server (port 8080). |
| `bun run build` | Production build. Run automatically by the platform on publish. |
| `bun run build:dev` | Dev-mode build; catches SSR-time errors early. |
| `tsgo` | Fast TypeScript typecheck (preferred over `tsc --noEmit`). |
| `bunx vitest run` | Run tests (once a suite is added). |

In the Lovable sandbox, builds and typechecks run automatically after edits — don't invoke them manually.

---

## 8. Adding a Feature (End-to-End)

The canonical flow, using a new "notes" feature as an example.

### 8.1 Database change

Use the migration tool (never raw SQL from code). Every `CREATE TABLE public.*` migration must include, in order:

1. `CREATE TABLE`
2. `GRANT` — `authenticated` + `service_role` (add `anon` only for public tables).
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY ...`

Use `has_role(auth.uid(), 'manager')` for manager-gated policies. Add `touch_updated_at()` triggers for mutable tables.

### 8.2 Types

The Supabase types file (`src/integrations/supabase/types.ts`) is regenerated after each migration runs — never edit by hand. Add feature-level types under `src/features/<domain>/types.ts`.

### 8.3 Server functions

Create `src/lib/notes/notes.functions.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({ title: z.string().min(1) });

export const listNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("notes").insert({ title: data.title, author_id: context.userId })
      .select("id").single();
    if (error) throw error;
    return { id: row.id };
  });
```

Rules recap:

- `.inputValidator()` runs BEFORE `.handler()`.
- Re-check manager-only actions inside the handler (`has_role(userId, 'manager')`).
- Dynamically import `supabaseAdmin` only when service-role is truly required.
- Return plain DTOs — no `Response`, streams, or class instances.

### 8.4 Query options

`src/features/notes/queries.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";
import { listNotes } from "@/lib/notes/notes.functions";

export const notesListOptions = queryOptions({
  queryKey: ["notes", "list"],
  queryFn: () => listNotes(),
});
```

### 8.5 Route

`src/routes/_authenticated/notes.tsx`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { notesListOptions } from "@/features/notes/queries";

export const Route = createFileRoute("/_authenticated/notes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(notesListOptions),
  component: NotesPage,
  errorComponent: ({ error }) => <div>Something went wrong: {error.message}</div>,
  notFoundComponent: () => <div>Not found</div>,
});

function NotesPage() {
  const { data } = useSuspenseQuery(notesListOptions);
  return <ul>{data.map(n => <li key={n.id}>{n.title}</li>)}</ul>;
}
```

- Every route with a loader MUST define `errorComponent` and `notFoundComponent`.
- Use `ensureQueryData` in the loader + `useSuspenseQuery` in the component — never `useEffect + fetch` for the initial render.
- Never call a protected server function from a **public** route's loader — SSR prerender has no session and the build fails.

### 8.6 Mutation from a component

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createNote } from "@/lib/notes/notes.functions";

function NewNoteForm() {
  const qc = useQueryClient();
  const create = useServerFn(createNote);
  const mutation = useMutation({
    mutationFn: (title: string) => create({ data: { title } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
  // ...
}
```

### 8.7 Add the route to navigation

Update `src/components/layout/AppShell.tsx` and (if user-facing) the Dashboard feature grid in `src/routes/_authenticated/dashboard.tsx`.

---

## 9. Coding Standards

### 9.1 TypeScript

- `strict: true`. No implicit `any`.
- Use `import type` for type-only imports.
- Path alias `@/*` maps to `src/*`.

### 9.2 Validation

- Every server-function input runs through Zod.
- Duplicate schemas at the client boundary only when the form needs its own error messages.

### 9.3 Styling

- Tailwind CSS v4 via `src/styles.css`.
- **Semantic tokens only** — never `text-white`, `bg-black`, `bg-[#...]` in components. Add tokens in `styles.css` and reference them.
- Mobile-first: design for 375px, layer up.
- shadcn/ui + Radix primitives for accessible interactive components.

### 9.4 Components

- Small and focused — extract when a file grows past ~200 lines.
- Business logic lives in server functions + query options; components render.
- Use `sonner` for toasts.
- Icons: `lucide-react`.

### 9.5 Naming

- Files: `kebab-case.tsx` for routes, `PascalCase.tsx` for components, `camelCase.ts` for utilities.
- Server-function files: `<domain>.functions.ts`. Server-only helpers: `<domain>.server.ts`.
- React components: `PascalCase`. Hooks: `useXxx`.

### 9.6 Accessibility

- Semantic HTML, one `<h1>` per route.
- ARIA labels on icon-only buttons.
- Keyboard navigable — rely on Radix defaults; test with tab/enter/esc.
- Colour contrast meets WCAG AA on both themes.

### 9.7 SEO (public routes)

- Set `head()` per route with a unique title (<60 chars) and description (<160 chars).
- Add `og:title`, `og:description`, `og:type`, `twitter:card`. Add `og:image` only when a real absolute HTTPS URL exists — never on `__root.tsx`.

---

## 10. Security Rules

- **Never** commit or log the service-role key. It is server-only.
- **Never** import `@/integrations/supabase/client.server` at module scope in a `.functions.ts` file — use `await import(...)` inside the handler.
- **Never** store user roles on `profiles` — always in `user_roles`.
- **Every** new public table needs RLS + GRANTS in the same migration.
- **Every** manager-only server function must re-check the role inside the handler, even if RLS would already block it.
- Do not expose Supabase URLs or the service key in user-facing text.

See `docs/04-DATABASE.md` for the RLS pattern and `docs/03-API.md` for existing authorization contracts.

---

## 11. Verification Before Publishing

Before you consider a change "done":

1. **Typecheck** passes (`tsgo`).
2. **Build** completes without errors (the platform runs this automatically).
3. **Manual smoke test** in the preview:
   - Sign in as a manager.
   - Exercise the new flow end-to-end.
   - Confirm role gates: sign in as staff (or without the role) and verify the UI + server function both refuse.
4. **RLS check** for any new table: hit it via the browser client and confirm anon requests are rejected.
5. **Console + network** clean of errors on the touched routes.

---

## 12. Documentation

When you ship a feature:

- Update `docs/03-API.md` with any new server functions.
- Update `docs/04-DATABASE.md` with any new tables / columns / policies.
- Update `docs/05-USER-GUIDE.md` if the change is user-visible.
- Update this guide if you introduce a new pattern other contributors should follow.

---

## 13. Getting Help

- **Lovable docs:** https://docs.lovable.dev/
- **TanStack Start docs:** https://tanstack.com/start/latest/docs/framework/react/overview
- **Supabase docs:** https://supabase.com/docs
- Internal: read the companion docs in `docs/` — PRD, TRD, API reference, database reference, user guide.

---

**End of Document.** This concludes the Day 5 documentation sprint: PRD → TRD → API → Database → User Guide → Developer Setup & Contribution Guide.
