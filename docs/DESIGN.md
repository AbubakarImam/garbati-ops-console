# garbati-ops-console — Design Document (v1, minimal)

**Status:** Design v1 (minimal) — ratified, not yet built.
**Last updated:** 19 October 2026
**Service name:** ops console frontend (`garbati-ops-console`) — not a "service" in the backend sense; owns no truth, holds no credential, talks to exactly one thing.
**Platform:** Garbati — see [`garbati-platform/ARCHITECTURE.md`](https://github.com/AbubakarImam/garbati-platform/blob/main/ARCHITECTURE.md) Section 3.1 (ops-console dependency chain) and [`Garbati.OpsApi/docs/DESIGN.md`](https://github.com/AbubakarImam/Garbati.OpsApi/blob/main/docs/DESIGN.md) — this document is the browser-side half of that service's Section 6 contract, and never repeats its reasoning, only this repo's own.
**Decision history:** `garbati-platform/TASKS.md` D-13 (React + TypeScript, owner's choice before this round); T-029.

## 1. Purpose and scope

This is the browser application bank staff use to operate GARBATI. It owns **nothing** — no database, no credential for `IdentityApi`/`OrchestratorApi`/`LedgerApi`/`StaffIdentityApi` (it cannot hold one; browser code is never trusted with a real service key), not even the session token itself (the login cookie is `HttpOnly` — this app's own JavaScript cannot read it, `Garbati.OpsApi/docs/DESIGN.md` 2.1a). It talks to exactly one thing: `OpsApi`. Every v1 screen (2) maps directly to one of `OpsApi` `docs/DESIGN.md` Section 6's six endpoint groups.

**The authorization matrix this app renders against (`OpsApi` Section 4) is UX, not security.** Hiding a nav link or a button from a `Teller` does not, by itself, stop a `Teller` from calling the underlying endpoint — `OpsApi` re-checks the real session's role on every single request, server-side, regardless of what the browser displayed. This app's role-based UI exists to keep the right screens in front of the right people, not as the actual control. Stated explicitly because it is the one security principle a frontend design can get silently wrong by implication.

## 2. Screens (v1), mapped 1:1 to `OpsApi` Section 6

| Screen | `OpsApi` endpoint group | Roles that see it (`OpsApi` Section 4) |
|---|---|---|
| Login | 0 (`POST /v1/ops/login`) | everyone, unauthenticated |
| Customer & account lookup | 1 | all seven roles |
| Customer detail edit (stage a change) | 2 | `CustomerServiceOfficer` (maker) |
| Customer detail edit (approve/reject queue) | 2 | `Supervisor` (checker) |
| Reversal requests (create) | 3 | `Teller`, `CustomerServiceOfficer` |
| Reversal requests (approve/reject queue) | 3 | `Supervisor` |
| Reversal requests (read-only oversight) | 3 | `ComplianceOfficer`, `RiskOfficer`, `Auditor` |
| Transfer/transaction testing console | 4 | `Teller`, `Supervisor` |
| Staff & role management | 5 | `Administrator` |
| Joint-account approval test console | 6 | `Supervisor` (act), `Auditor` (read-only) — labeled in-UI as a stand-in for a real customer channel that doesn't exist yet, per `OpsApi` 6's own framing |

No screen outside this table exists in v1. A role with nothing to do on login (none exist today — every role has at least customer/account lookup) would just see that one screen; not a case this version needs to handle specially.

## 3. Stack

- **Vite + React 18 + TypeScript.** Vite over Create React App (unmaintained) or Next.js (its SSR/server-routing machinery solves problems this app doesn't have — there's no public page needing SEO, no server-rendered content; everything is behind a login) — a plain client-rendered SPA is the right shape here, and Vite is the standard, fast, minimal-config tool for building one.
- **React Router v6** for client-side routing between the screens in Section 2.
- **TanStack Query (React Query)** for every call to `OpsApi` — handles loading/error/retry/caching state consistently across every screen's data-fetching, rather than each screen hand-rolling its own `useEffect`/`fetch`/loading-flag boilerplate. One real cost (a new dependency) for a real, repeated problem every screen in Section 2 has.
- **Ant Design** for UI components. **Recommendation, not a locked-in requirement — easy to swap before much is built if you'd rather go a different direction.** Reasoning: Ant Design's component set (`Table`, `Form`, `Descriptions`, layout/menu primitives) is specifically strong for exactly this kind of admin/back-office console — most of Section 2's screens are a search box, a table, a form, and an approve/reject action, which is squarely what it's built for, with less custom styling work than a lower-level toolkit (Tailwind) or a more generic one (MUI/Chakra) would need for the same result.
- **Plain controlled form state (`useState`) for v1, not a form library.** Section 2's forms (login, customer edit, reversal request) are small and not deeply validated yet — a form library (React Hook Form) is a reasonable later addition if forms grow more complex, not a v1 requirement.

## 4. Auth flow

1. `POST /v1/ops/login` with `{username, password}`. On success, `OpsApi` has already set the session cookie (`HttpOnly`/`Secure`/`SameSite=Strict` — this app's code never touches it directly, `Garbati.OpsApi/docs/DESIGN.md` 2.1).
2. Immediately call `GET /v1/ops/me` → `{staffId, fullName, role}`. Store in a top-level React context (`AuthContext`) — this is the **only** place `role` lives on this side; every role-gated nav item/route reads from here, never from a locally-recomputed guess.
3. **Every full page load** (first visit, refresh, a bookmarked URL) calls `GET /v1/ops/me` before rendering anything role-gated, exactly because the cookie is invisible to this app's own code (4's whole reason for existing, `Garbati.OpsApi/docs/DESIGN.md` 2.1a). A `401` here means "not logged in" — route to Login, no special-casing needed elsewhere.
4. Any API call anywhere in the app that comes back `401` (session expired mid-use, or revoked by an Administrator action elsewhere, `Garbati.OpsApi/docs/DESIGN.md` 2.3) redirects to Login the same way — one shared handler (a React Query global error handler, or an `axios`/`fetch` wrapper's shared interceptor), not re-implemented per screen.
5. `POST /v1/ops/logout` on an explicit "log out" action; clears `AuthContext` and routes to Login.

## 5. Role-gated navigation

A layout shell (sidebar nav + top bar showing the logged-in staff member's name/role, Ant Design's `Layout`/`Menu`) renders only the nav items `AuthContext.role` is allowed to see, per Section 2's table — a plain lookup against the same matrix `OpsApi` Section 4 already defines, kept as one shared constant so the two never silently drift apart. Restated from Section 1: this is for a coherent experience, not the actual control — a direct URL visit to a route the current role can't use still only works if `OpsApi` itself allows the underlying call; this app shows a plain "not permitted" state (from the real `403` `OpsApi` returns) rather than trying to pre-emptively guess and block it client-side.

## 6. Local development

Vite's `server.proxy` forwards `/v1/ops/*` from the dev server's own port straight to a locally-running `OpsApi` — the browser sees same-origin requests in dev exactly as it will in production (`Garbati.OpsApi/docs/DESIGN.md` 2.1b), so no CORS code path is ever needed, in any environment, and local login/session behavior matches production behavior exactly rather than needing a separate dev-only auth shortcut.

## 7. Deployment

This repo's own GitHub Actions workflow builds the Vite production bundle (`npm run build` → `dist/`) and deploys it via a plain zip/file deploy into a dedicated static-assets folder on `OpsApi`'s already-running Azure Web App — using this repo's **own** scoped Azure credential, never touching `OpsApi`'s repository, build, or deploy pipeline (`Garbati.OpsApi/docs/DESIGN.md` 2.1b, decision #6). The two repos' CI stay fully independent; they just happen to land on the same origin, which is what makes `SameSite=Strict` cookies work at all.

## 8. Testing (v1 scope)

**Vitest + React Testing Library** for component/logic tests — in particular: the role-gated nav/route logic (Section 5) actually shows/hides the right items per role, the `401`-anywhere-redirects-to-Login behavior (Section 4 step 4), and `AuthContext`'s handling of a `GET /v1/ops/me` failure on initial load. **Not in v1:** full browser end-to-end tests (Playwright/Cypress) — a real, valuable addition once there's a deployed `OpsApi` to test against for real (mirrors this platform's own pattern elsewhere of noting what a test suite does and doesn't prove, e.g. `Garbati.OrchestratorApi/docs/DESIGN.md` Appendix A item 2).

## 9. What "done" looks like for the first build task

A follow-up task builds: the Vite project skeleton, `AuthContext`/the shared `401` handler, the layout shell and role-gated nav (Section 5), and the eight screens in Section 2 — each calling exactly the `OpsApi` endpoint group it maps to, with no screen inventing its own data shape where `OpsApi`'s response already defines one. Depends on `OpsApi` (T-028's design) actually being built first — there is nothing for this app to call yet.

## 10. Open questions / explicitly deferred

1. **This repo cannot be built or tested against a real `OpsApi` instance until `OpsApi` itself is built** (T-028 is design-only so far) — a mock/stub server is a reasonable way to develop screens in parallel, but the real integration can't be proven until both exist.
2. MFA for privileged actions (approving a reversal, editing a customer) — flagged without a concrete mechanism in both `Garbati.StaffIdentityApi/docs/DESIGN.md` and `Garbati.OpsApi/docs/DESIGN.md`; this app has no UI for it yet either, for the same reason.
3. Accessibility (keyboard navigation, screen-reader support) — not explicitly scoped for v1; Ant Design's components have reasonable defaults out of the box, but nothing here has been specifically audited.
4. Whether `ComplianceOfficer`/`RiskOfficer` ever need more than read-only oversight of the reversal queue — same open question `Garbati.OpsApi/docs/DESIGN.md` Section 8 already flagged; this app's UI for those two roles is read-only because that's what Section 4 currently grants, not a separate decision.
