# garbati-ops-console

GARBATI's bank ops/back-office console — the web application staff use to operate the platform: look up customers and accounts, work the reversal and joint-account approval queues, run transfer/transaction testing, update account details, and manage staff accounts and roles.

Built with Vite + React 18 + TypeScript. Talks to exactly one thing — [Garbati.OpsApi](https://github.com/AbubakarImam/Garbati.OpsApi) — and holds no credential and owns no truth of its own; the session cookie it relies on is `HttpOnly`, meaning this app's own code can't even read it directly.

The design, including every trade-off, is in [docs/DESIGN.md](docs/DESIGN.md) — start there for the *why*. See [`garbati-platform/ARCHITECTURE.md`](https://github.com/AbubakarImam/garbati-platform/blob/main/ARCHITECTURE.md) Section 3.1 for how this fits the ops-console flow: **this app → OpsApi → StaffIdentityApi / IdentityApi / OrchestratorApi / LedgerApi**.

## Status

Design v1 (minimal) ratified, 19 October 2026. Not yet built — depends on [Garbati.OpsApi](https://github.com/AbubakarImam/Garbati.OpsApi) being built first (its own design is ratified but also not yet built).

## Deployment

This repo deploys its own build straight into a dedicated static-assets folder on `OpsApi`'s Azure Web App — same origin, no CORS, independent CI from `OpsApi`'s own. See `docs/DESIGN.md` Section 7.
