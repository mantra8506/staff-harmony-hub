# Restaurant Staff Management System — Phase 1 Plan

This is a **planning document only**. No code, schema, or UI will be built from this. It captures decisions made so far, locks scope for a single full-service dine-in restaurant with under 15 staff, and sequences the next planning conversations.

---

## 1. Vision

A simple, mobile-first staff operations app for a small full-service restaurant. The owner/manager publishes a weekly schedule in minutes, staff see their shifts and request swaps from their phone, and everyone stops relying on WhatsApp screenshots and paper rotas. The system grows feature-by-feature (attendance → payroll → comms → performance) without becoming enterprise HR software.

## 2. Problems We Solve (Phase 1 scope)

Primary:
- Weekly schedule is built in spreadsheets or chat — hard to update, no history.
- Shift swaps happen informally; managers find out at service time.
- No single source of truth for "who is working tonight."
- No-shows and last-minute call-outs aren't tracked.

Explicitly **out of scope for now** (revisit later phases): payroll, tips, POS integration, inventory, reservations, customer-facing anything.

## 3. Users & Roles

For a <15 person dine-in restaurant, three roles are enough:

| Role | Who | Core capability |
|---|---|---|
| **Owner / Manager** | 1–2 people | Full access: staff, schedule, approvals, reports |
| **Shift Lead** (optional) | Senior server / sous chef | Can view full schedule, approve swaps when manager off, mark attendance |
| **Staff** | Servers, host, bartender, line cooks, dishwasher | See own schedule, request time off, request swaps, view announcements |

Open question: do we need the Shift Lead role on day one, or start with just Manager + Staff and add it later?

## 4. Departments / Positions (data we'll need)

Front of house: server, host, bartender, runner.
Back of house: head chef, line cook, prep, dishwasher.
Each staff member has a **primary position** and optional **secondary positions** they can cover — important for swap eligibility.

## 5. Modules & Phase Sequencing

```text
Phase 2  Staff Directory          (foundation: people, roles, positions)
Phase 3  Scheduling               (THE priority — weekly rota, publish, view)
Phase 4  Shift Swaps & Time Off   (requests, approvals, notifications)
Phase 5  Attendance               (clock in/out, late/no-show tracking)
Phase 6  Communication            (announcements, shift notes)
Phase 7  Payroll basics           (hours export, later: full payroll)
Phase 8  Performance              (ratings, reviews, milestones)
Phase 9  Multi-restaurant         (only when first location is stable)
```

We will not skip ahead. Each phase = its own planning round, then build, then test.

## 6. Phase 3 Scheduling — what "done" looks like

Because this is the user's top pain, we define it sharply now so Phase 2 (staff directory) is shaped to support it:

- Manager opens a week view, sees positions down the side and days across the top.
- Drag/click to assign a staff member to a shift (start, end, position, optional break).
- Templates: copy last week, save a "typical week" template.
- Publish action → staff get notified, shifts become visible to them.
- Edits after publish are flagged as changes (staff sees "updated").
- Staff has a "My shifts" view (this week + next week) on mobile.
- Conflict warnings: double-booking, unavailable day, exceeds max hours.

## 7. Core User Journeys (to validate next round)

1. **Manager builds next week's schedule** — opens app Sunday, copies last week, adjusts for time-off requests, publishes.
2. **Staff checks their week** — opens app, sees 4 shifts, taps one for details.
3. **Staff requests a swap** — picks a shift, picks who to swap with (only eligible coworkers shown), other person accepts, manager approves.
4. **Staff requests time off** — picks dates, reason, manager approves/denies; blocked from being scheduled on approved days.
5. **Manager handles a same-day call-out** — marks staff as absent, sees who else is qualified + available, sends a "pick up this shift?" request.

## 8. High-Level Data Concepts (not a schema)

People: staff profile, contact, positions they can work, weekly availability, max hours/week.
Time: shifts (date, start, end, position, assignee), shift templates, time-off requests, swap requests.
Org: positions, optionally departments.
Activity: schedule publish events, shift change log, notifications.

Auth and storage will be handled by Lovable Cloud when we get there — not a planning concern yet.

## 9. Dashboard Ideas (for later refinement)

**Manager home:** today's roster, open swap/time-off requests, unfilled shifts this week, who's late/absent.
**Staff home:** next shift (with countdown), this week at a glance, pending requests, latest announcement.

## 10. Future Expansion (parked, not designed now)

Multi-location, payroll + tip pooling, POS/sales integration for labor-cost ratios, performance reviews, training/certifications (e.g. food handler expiry), customer no-show tracking, AI auto-scheduling from forecasted covers.

---

## Decisions Locked
- Target: single full-service dine-in restaurant, under 15 staff.
- First problem to solve: **scheduling & shift swaps**.
- Roles: Manager, Staff, (maybe) Shift Lead.
- Mobile-first for staff; desktop-or-mobile for manager.
- Phased build, no skipping ahead.

## Open Questions (need answers before Phase 2 plan)
1. **Region / labor rules** — country, currency, language(s), and any legal rules we must respect (max hours, mandatory breaks, overtime, weekend rules)?
2. **Shift Lead role** — include on day one, or defer?
3. **Languages** — single language UI, or do staff need a second language (e.g. Arabic, Spanish, Tagalog)?
4. **Staff devices** — do all staff have smartphones with data, or do some need an SMS/printed fallback?
5. **Existing tools** — what is the manager using today (WhatsApp, Excel, 7shifts, Deputy)? What do they want to keep?
6. **Owner = Manager?** — is the owner hands-on daily, or is there a separate GM who runs operations?
7. **Tip handling** — even though payroll is later, do tips need to be tracked from day one for fairness reports?

## Recommendations
- Keep Phase 2 (Staff Directory) deliberately small: name, contact, position(s), weekly availability, max hours. Resist adding documents, emergency contacts, certifications until we need them.
- Decide region/labor rules now — they shape availability, max hours, and break rules baked into the scheduler.
- Skip Shift Lead on day one unless the owner explicitly needs it; one less role = simpler permissions.
- Plan notifications channel early (in-app + email is enough; SMS/WhatsApp can wait).

## Next Planning Step
Answer the Open Questions above (especially #1 region and #5 current tools), then we move to **Phase 2 planning: Staff Directory** — exact fields, availability model, and how a staff member is invited/onboarded into the app.
