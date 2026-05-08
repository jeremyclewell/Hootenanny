# Hootenanny — Code Review & Change List

_Reviewed: 2026-05-07 against `main` @ `fc75e44`._

This is a deep read of the whole repo (server, shared, client, configs)
focused on the four things you asked about: quality, efficiency, holistic
coherence, and UI/style consistency. Findings are grouped by theme. At the
end there's a prioritized **Change List** that splits work between (a) what
gets implemented in this branch and (b) what's flagged for you to decide on.

The app overall is in good shape — it's a single coherent product, the
schema is reasonable, the realtime/WS plumbing is correct, and the recent
design pass on the home/event/RSVP screens shows a real visual identity.
What's accumulating is the kind of friction you get from fast iteration:
small inconsistencies between screens, drifted form patterns, dead config,
and a few subtle bugs around state and effects.

---

## 1. Holistic — does it make sense?

**Yes — with one notable seam.**

The architecture is consistent and idiomatic for the stack: Vite + React +
Wouter + TanStack Query on the front, Express + Drizzle/Neon + ws on the
back, Zod schemas in `shared/` driving both. The polling-then-finalize flow,
the host-token authorization pattern, the WS broadcast pattern — all of
that hangs together cleanly.

**The seam:** modal state is wired through `window.dispatchEvent` /
`window.addEventListener` with `CustomEvent`. `ItemCategories` fires
`openClaimModal`, `autoClaimItem`, and `openEditItemModal` events that
`ClaimItemModal` and `EditItemModal` listen for at the page level. This
works, but it's a global event bus inside React — type-unsafe, hard to
follow, hard to test, and brittle (the listeners use `as any` casts to
stay quiet). A small modal context, a Zustand store, or hoisting the
selected-item state into `EventPage` would all be more idiomatic. **Not
fixed in this branch** because the change touches three components and
should get your input on shape first.

---

## 2. Bugs (real, not stylistic)

### 2.1 EditItemModal categories don't match the rest of the app
**File:** `client/src/components/edit-item-modal.tsx` (lines 114–125)

The edit modal exposes 10 categories: appetizers, main-dishes, sides,
desserts, beverages, **snacks, salads, bread, condiments, other**. The
add-custom modal (`add-custom-item.tsx`) and the renderer
(`item-categories.tsx`) only know 5: appetizers, main-dishes, sides,
desserts, beverages.

Result: a user can edit an item into category `snacks`, and it disappears
into a section with no icon and a literal display name `snacks`. Fix:
share one source of truth for categories and use it in all three places.

### 2.2 ClaimItemModal listener re-binds on every render
**File:** `client/src/components/claim-item-modal.tsx` (line 128)

```js
useEffect(() => { ... }, [form, claimItemMutation]);
```
`claimItemMutation` is a new object every render, so the effect tears down
and re-attaches both window listeners on every render. Functionally not
catastrophic (the listeners do the same thing) but wasteful and a
foot-gun. Fix: use a ref or restructure so the listener is registered
once.

### 2.3 `event.tsx` has dead imports and a no-op prop
**File:** `client/src/pages/event.tsx`

- `format`, `parseISO` (date-fns) are imported but never used in this file.
- `CalendarCheck` (lucide) is imported but never used.
- `<EventOverview onViewDates={() => {}} />` — the "View all" button on the
  vote-for-a-date overview card calls a no-op. Dead UI.
- `voteCount={votes.length}` is passed to `<QuickStats showVotes={false}>`
  — `showVotes` is hard-coded false, so the count tile is never rendered
  and the votesQuery in this file exists only to feed a value that's never
  shown. The query is also duplicated inside `EventOverview`.

### 2.4 `ReopenPollBanner` uses raw Tailwind greys and unformatted dates
**File:** `client/src/components/reopen-poll-banner.tsx` (lines 90–98)

- `${event.date}` is interpolated raw (`yyyy-MM-dd`) instead of human
  format like the rest of the app.
- `border-gray-200`, `text-gray-600` — Tailwind greys instead of design
  tokens (`border-border`, `text-muted-foreground`). Visually drifts off
  the cream/sand palette under the banner.

### 2.5 Not-Found page is unstyled and off-brand
**File:** `client/src/pages/not-found.tsx`

`bg-gray-50`, `text-red-500`, `text-gray-900`, `text-gray-600`, no serif
heading. Looks like the un-customized shadcn boilerplate it started as.
Doesn't match anything else in the app.

### 2.6 EditItemModal bypasses the `Form` pattern used everywhere else
**File:** `client/src/components/edit-item-modal.tsx`

Every other form (`create-event`, `add-custom-item`, `claim-item-modal`,
`rsvp-dialog`) uses `<Form>/<FormField>/<FormControl>/<FormLabel>/<FormMessage>`.
EditItemModal uses raw `<Label>`, `form.register`, `form.watch`,
`form.setValue`, and inline `<p className="text-sm text-red-600">` for
errors (raw red, not `text-destructive`). It still works but it's the odd
one out, and the error styling drifts off-palette.

### 2.7 `tailwind.config.ts` references undefined sidebar CSS vars
**File:** `tailwind.config.ts` (lines 86–95)

`colors.sidebar.*` resolves to `var(--sidebar-background)` and friends,
but `index.css` never defines those variables. Not currently breaking
anything (no consumer uses `bg-sidebar`), but will silently produce
invalid CSS the moment something does. Boilerplate from when shadcn's
sidebar was scaffolded — should be removed.

### 2.8 Duplicate shadow utilities
**File:** `client/src/index.css`

`.shadow-warm` / `.shadow-warm-lg` and `.shadow-material` /
`.shadow-material-lg` are byte-for-byte identical pairs; the comment
above them admits it. Grep confirms no remaining `shadow-material`
references in the app — the back-compat aliases can go.

### 2.9 Duplicated `parseLocalDate`
**Files:** `client/src/components/event-header.tsx` (l. 21) and
`client/src/pages/create-event.tsx` (l. 29).

Identical helper in both places. Belongs in `lib/calendar.ts` next to its
siblings.

### 2.10 Inconsistent ellipsis in pending button labels
- `claim-item-modal.tsx`: `"Claiming..."` (three dots)
- `edit-item-modal.tsx`: `"Updating..."` (three dots)
- `reopen-poll-banner.tsx`: `"Reopening..."` (three dots)
- vs. `add-custom-item.tsx`: `"Adding…"`, `create-event.tsx`: `"Creating…"`,
  `poll-view.tsx`: `"Saving…"`, `rsvp-dialog.tsx`: `"Saving…"`,
  `"Removing…"`

Pick one and stick to it. The newer code uses `…` (U+2026); the older
code uses `...`.

### 2.11 Inconsistent storage key naming (cosmetic)
`localStorage` keys are a mix of eras: `potluck-user-name`,
`potluck-user-email` (claim modal — predates the rename),
`hootenanny-host-${id}` (event page), `hootenanny-voter` (poll/RSVP).
Old keys still work for existing users; renaming would lose their saved
identity. **Flagged, not fixed.** Worth a one-shot migration shim if you
do it.

---

## 3. Efficiency / performance

### 3.1 N+1 inserts on event creation
**File:** `server/routes.ts` (lines 60–69) and finalize handler at
lines 184–197.

Theme items are seeded with one INSERT per item in a loop. For a 20-item
theme that's 20 round-trips against the database. Drizzle supports bulk
insert via `db.insert(items).values([...])` — one round-trip. For a
serverless Postgres connection (Neon) that's a meaningful latency win on
the create-event path.

### 3.2 PUT/DELETE/unclaim do `getEventItems` on every request
**File:** `server/routes.ts` (lines 421–422, 461–462, 501–502)

To check if an item is claimed before edit/delete/unclaim, the code
loads ALL items for the event and `find()`s the one. A single
`SELECT WHERE id = ?` would do the same job and not scan the whole list.

### 3.3 `upsertVote` and `upsertRsvp` load all rows then filter in JS
**File:** `server/storage.ts` (lines 203–238, 244–281)

Both implementations fetch every vote / every RSVP for the event, do a
case-insensitive match in JS, then update or insert. The case-insensitive
match is the constraint, but it can be expressed as a SQL `WHERE
LOWER(...) = LOWER(...)` and reduce the read cost. Better still: add a
unique index on `(event_id, lower(name), lower(email))` and use a real
upsert (`onConflictDoUpdate`).

### 3.4 Trust-boundary check in custom-item POST
**File:** `server/routes.ts` (lines 369–374)

The `eventId` for custom items comes from the URL param, which is good.
But `insertItemSchema` is parsed directly from `req.body` after
spreading the URL `eventId` — meaning a client can pass arbitrary
`claimedBy`/`claimedByEmail`/`claimedAt`/`isCustom` and have them
inserted. The override `isCustom: true` covers that field but not the
others. Low-severity (no auth, this is a community potluck app) but
worth shaping the input schema to reject those fields.

### 3.5 Repeated `today` / `fourWeeksOut` recomputation
Several components recompute these every render with the same verbose
pattern (`new Date(new Date().setHours(0, 0, 0, 0))`). Cheap, but a
shared helper (`startOfToday()`, etc., from `date-fns`) would be both
faster to read and free of the `setHours` mutation idiom.

### 3.6 Server logger truncates at 80 chars
**File:** `server/index.ts` (lines 32–34)

Every API log line is sliced to 79 chars + ellipsis. Useful for terminal
output, but it silently drops the response body on anything non-trivial,
making logs less useful when debugging. Consider raising or making it
configurable.

---

## 4. Dependency hygiene

### 4.1 Unused production dependencies
Grep finds zero imports of these packages anywhere in `client/` or
`server/`:

- `connect-pg-simple` (Postgres session store — no sessions in use)
- `express-session` (no session middleware mounted)
- `passport` and `passport-local` (no auth)
- `memorystore` (no in-memory session store mounted)
- `next-themes` (no theme switcher; the `.dark` block in CSS is unused)
- `tw-animate-css` (devDependency, not imported)
- `@tailwindcss/vite` (Tailwind v4 plugin; project is on v3 — vite config
  doesn't load it)

These are harmless at runtime but they bloat `node_modules`, slow
installs, and drag the Snyk/Dependabot surface area up. **Recommend
removing.**

### 4.2 Shadcn UI components scaffolded but unreferenced
The following `client/src/components/ui/*.tsx` files exist but have no
consumers in the app:
`accordion`, `alert`, `aspect-ratio`, `avatar`, `breadcrumb`, `carousel`,
`chart`, `collapsible`, `command`, `context-menu`, `drawer`,
`hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`,
`progress`, `resizable`, `scroll-area`, `sheet`, `sidebar`, `slider`,
`switch`, `table`, `toggle`, `toggle-group`, `tooltip` (used only by App
provider), `chart`, `sidebar`.

(I did not delete these — you may want them as a kit you can
"shadcn add"-style pull from at any time. **Flagged, not fixed.**)

### 4.3 Repo-bloat: `attached_assets/` is 6.9 MB of screenshots
Eight PNGs from May 4 (some 3.5 MB, some 1+ MB) in the repo. The
`@assets` Vite alias is set up but no source file references them. They
look like the design references you used while iterating. They'll keep
growing the clone size for everyone. **Recommend** moving them out of
the repo into a separate design-refs folder, attaching them to PRs/
issues, or `.gitignore`-ing the directory and keeping a local copy.

---

## 5. UI / styling consistency

This is where the most paper cuts live. Symptoms below; treatments
mostly small.

### 5.1 Header chrome is duplicated
**Files:** `client/src/pages/home.tsx` (lines 8–29),
`client/src/pages/create-event.tsx` (lines 110–128),
`client/src/components/event-header.tsx` (lines 94–158).

Three near-identical implementations of the brand header (utensils icon
in primary square + serif "Hootenanny" wordmark + actions on the right).
Worth extracting a `<SiteHeader>` component that takes optional
`subtitle` and `actions` slots. **Not fixed in this branch** (would
restructure shared layout, want your sign-off on the API).

### 5.2 Off-palette colors leak in
- `not-found.tsx`: greys + raw red.
- `reopen-poll-banner.tsx`: greys.
- `edit-item-modal.tsx`: `text-red-600` for form errors.

The design system has tokens for everything (`destructive`,
`muted-foreground`, `border`, etc.) — using them keeps dark-mode-ready
and consistent.

### 5.3 Hard-coded layout numbers
**File:** `client/src/pages/home.tsx`

Hero mockup cards use absolute positioning with magic numbers:
`top-[185px]`, `top-[200px]`, `left-[8%]`, `right-[0%]`, etc. They look
right at the design widths but small viewport changes nudge them out of
alignment. If you want this to stay rock-solid, consider a more
constraint-based layout (CSS grid with named areas, or a
`transform`/percentage stack).

### 5.4 Mixed card surface styles within the same screen
On `EventPage` you have:
- `bg-card` cards (event header, quick stats, RSVP list)
- `bg-terracotta-50` cards (potluck category sections)
- `bg-sand-100` cards (host-only finalize panel, reopen-poll banner,
  some result rows)
- `bg-sage-50` and `bg-teal-50` accent cards (RSVP groups,
  "picking a date" banner)

Each has a clear semantic ("warm" / "host action" / "going /
maybe / can't"), but they appear in the same scroll without a unifying
rhythm — the eye gets four pastel backgrounds in a row. Two
recommendations:
1. Document the surface palette in code (a small `client/src/lib/surfaces.ts`
   that exports `bg-host`, `bg-section`, etc.) so usage stays
   intentional.
2. Lean toward `bg-card` as the default and reserve the colored
   backgrounds for true semantic meaning. Right now `bg-terracotta-50`
   is used as a generic "category" wrapper — that's a lot of warm
   real-estate for what is essentially neutral content.

### 5.5 Inconsistent spacing & radii on similar cards
- Most cards: `rounded-2xl border border-border shadow-warm p-4` to `p-6`.
- Item categories card: `rounded-2xl p-2.5 shadow-warm` (no border —
  it's intentional but reads visually different).
- Quick-stat tiles: `rounded-2xl border border-border shadow-warm p-4`.

A shared `Surface` component (or just a documented Tailwind class string
constant) would help future cards stay on rails.

### 5.6 Duplicate category icon/name maps
- `categoryConfig` in `item-categories.tsx` (5 categories with icons).
- `categoryNames` in `claim-item-modal.tsx` (5 categories, no icons).
- Inline list in `add-custom-item.tsx` (5 categories).
- Different inline list in `edit-item-modal.tsx` (10 categories — see
  bug 2.1).

One source-of-truth array in `lib/categories.ts` would fix the bug AND
the duplication.

### 5.7 Overuse of inline `style={{...}}` with HSL strings
`map-banner.tsx` uses inline styles for color (`hsl(14, 56%, 51%)`,
`hsla(52, 65%, 93%, 0.18)`, etc.) that mirror values already declared
as CSS variables in `index.css`. Moving them to `var(--primary)`,
`hsl(var(--background) / 0.18)` etc. keeps them in sync if the palette
ever changes.

---

## 6. Accessibility & polish

- **Missing `<title>` updates per page.** Wouter doesn't set the document
  title; nothing else does either. Every page has the default `index.html`
  title. Easy `useEffect` per page (or a tiny `useTitle` hook) would help
  SEO/sharing/screen-reader orientation.
- **`role="listbox"` on the autocomplete works, but the `<Input>` should
  carry `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`,
  `aria-controls`, `aria-activedescendant`** to make it discoverable to
  assistive tech.
- **Item rows in `item-categories.tsx`** are `<div>` with `onClick`. They
  should be `<button>` or carry `role="button"` + `tabIndex={0}` +
  keyboard handler — currently keyboard users can't claim an item from
  the list at all (only via the "Claim" button, which is fine, but the
  whole-row affordance suggests it should be clickable everywhere).
- **`<button>` for icon-only delete in `rsvp-list.tsx`** uses `title=""`
  but no `aria-label`. Title attributes don't make it to most screen
  readers.
- **No favicon swap from Vite default** (didn't check beyond
  `generated-icon.png` existing in the repo root). Worth wiring up.

---

## 7. Testing & CI

There are no tests in the repo (`vitest`, `jest`, `playwright`, etc. are
absent from `package.json`). For an app with a polling state machine,
host-token authorization, vote tallying, and date-finalization logic,
that's the biggest single risk. Suggested first targets:

- **`storage.upsertVote` / `upsertRsvp`** — case-insensitive matching is
  load-bearing and easy to break.
- **`/api/events/:id/finalize`** — host-token check, candidate-set
  membership, theme-item seeding fence.
- **`/api/events/:id/reopen`** — preserves prior votes, rolls finalized
  date back into candidate set.
- **`buildIcsContent` / `buildGoogleCalendarUrl`** — easy to unit-test
  and easy to break with date-format changes.

There's also no GitHub Actions / CI workflow. Even just `tsc --noEmit`
on PR would catch the dead-import / type-narrowing slips noted above.

---

## Change List

### Implemented in this branch

These are mechanical, low-risk, and don't change design intent. Each is
a separate commit so you can revert any single one without losing the
rest:

1. **Fix `not-found.tsx` to match the design system.** Cream bg, serif
   heading, `text-destructive`, app header chrome.
2. **Fix EditItemModal category list** to match the rest of the app
   (5 categories, not 10). Eliminates the silent-corruption bug 2.1.
3. **Switch EditItemModal to the shared `Form`/`FormField` pattern**
   used everywhere else and replace `text-red-600` with
   `text-destructive`.
4. **Consolidate categories into `client/src/lib/categories.ts`** as
   single source of truth; consume from `item-categories`,
   `add-custom-item`, `edit-item-modal`, `claim-item-modal`.
5. **Consolidate `parseLocalDate` and `today/fourWeeksOut` helpers** into
   `client/src/lib/calendar.ts`. Remove duplicates from `event-header`
   and `create-event`. Remove duplicates of `today`/`fourWeeksOut`
   from `poll-view` and `reopen-poll-banner`.
6. **Fix `reopen-poll-banner.tsx`** — use design tokens (`border-border`,
   `text-muted-foreground`) and format the date as
   `EEE, MMM d, yyyy`.
7. **Remove dead imports & no-op props in `event.tsx`**, drop the
   unused `votesQuery` (it duplicates one inside `EventOverview`),
   delete `voteCount`/`showVotes` plumbing from `QuickStats` since it
   is never enabled.
8. **Drop `EventOverview.onViewDates` no-op prop.** "View all" now
   either does something useful (jumps to a future tab, when one
   exists) or the button is removed.
9. **Fix `ClaimItemModal` listener effect dependencies** so it doesn't
   re-bind window listeners on every render.
10. **Normalize ellipsis in pending labels** to `…` everywhere.
11. **Remove duplicate shadow utilities** (`.shadow-material*`) from
    `index.css` since no consumers reference them.
12. **Clean up `tailwind.config.ts`** — remove the `colors.sidebar` block
    that points at undefined CSS variables.
13. **Bulk-insert seeded theme items in `routes.ts`** — collapse the
    per-item `INSERT` loop to a single `db.insert(items).values([...])`.
14. **Replace per-request `getEventItems → find` in PUT/DELETE/unclaim
    handlers** with single-row `getItem(id)`.
15. **Tighten the custom-item POST input schema** so `claimedBy`,
    `claimedByEmail`, `claimedAt` cannot be set by the client.
16. **Lift the API log-line truncation cap** from 80 to 200 so response
    bodies are visible during dev.
17. **Replace inline HSL strings in `map-banner.tsx`** with the existing
    CSS variables.

### Flagged for you (intentionally not in this branch)

These need a decision or have wider blast radius than I want to make
unilaterally:

- **A. Drop the unused production dependencies** (`connect-pg-simple`,
  `express-session`, `passport`, `passport-local`, `memorystore`,
  `next-themes`, plus devDeps `tw-animate-css`, `@tailwindcss/vite`).
  Safe in principle, but if you have any plan for auth or theming in
  the next few weeks, leaving them avoids re-installing.
- **B. Delete unreferenced shadcn UI files.** Shrinks the repo by ~30
  files but loses the easy `import { Slider } from "@/components/ui/slider"`
  superpower if you decide to add a slider tomorrow.
- **C. Move `attached_assets/` out of the repo (~6.9 MB).** They look
  like design references; if they're irreplaceable, git-LFS them, and
  if not, archive them in a Drive folder or PR comments.
- **D. Replace the `window.dispatchEvent` modal bus** with a small
  context (e.g. `<ItemActionsProvider>` exposing
  `openClaim(item)`/`openEdit(item)`). Substantively cleaner; touches
  three files.
- **E. Extract a `<SiteHeader>` component** to dedupe the brand header
  across home, create-event, and event pages.
- **F. Storage layer indices + true upserts** for votes/rsvps (would
  need a migration), bug 3.3.
- **G. Migration shim for old `potluck-user-*` localStorage keys**
  (`hootenanny-user-*`) so users don't lose their saved name/email.
- **H. Add a `<title>` per page** (or a tiny `useTitle` hook).
- **I. Improve a11y on autocomplete combobox and item rows.**
- **J. Add a CI workflow** that runs `tsc --noEmit` on PR. Two-line
  GitHub Actions file. Separate from any test suite — see K.
- **K. Add a basic test harness** (Vitest + Supertest), starting with
  the highest-value targets in §7.

---

_Generated by Claude as part of a code-review pass on the current
`main` branch._
