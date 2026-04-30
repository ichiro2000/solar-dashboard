# Solar Dashboard

Production-grade Next.js 14 dashboard for a GoodWe hybrid inverter, talking to
the (undocumented) SEMS portal API. Self-hosted, single-tenant, password-gated.

- **Frontend:** Next.js 14 App Router, React 18, Tailwind, shadcn/ui, Recharts,
  Framer Motion, TanStack Query, Zustand.
- **Backend:** Next.js Route Handlers, NextAuth (Credentials), Prisma + SQLite
  for rolling history, in-process sampler, in-memory TTL cache.
- **Security:** SEMS credentials never reach the browser. Tokens are stored
  AES-GCM-encrypted in SQLite. Login is rate-limited. CSP + secure cookies.

## Quick start

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local

# Generate the secrets the .env.example asks for:
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"   # → DASHBOARD_PASSWORD_HASH
openssl rand -base64 32                                                    # → NEXTAUTH_SECRET
openssl rand -hex 32                                                       # → SESSION_ENCRYPTION_KEY

pnpm db:migrate            # creates ./data/solar.db
pnpm dev                   # http://localhost:3000
```

The dashboard defaults to `DATA_SOURCE=mock`, so you can build/style without
SEMS credentials. Drop in real credentials and set `DATA_SOURCE=sems` to flip
to live data.

## Configuration

See [.env.example](./.env.example) for all variables. The most important ones:

| Var | Purpose |
|---|---|
| `DATA_SOURCE` | `mock` or `sems`. Defaults to `mock` when SEMS creds missing. |
| `SEMS_ACCOUNT` / `SEMS_PASSWORD` | Owner-tier SEMS account. Installer/SSO accounts are rejected. |
| `SEMS_REGION` | `auto`, `eu`, `us`, `au`, or `hk`. Pin to skip the cross-region redirect. |
| `SEMS_BATTERY_SIGN` / `SEMS_GRID_SIGN` | `auto` or `inverted`. Day-one calibration overrides. |
| `DASHBOARD_PASSWORD_HASH` | Bcrypt hash of the shared password. |
| `NEXTAUTH_SECRET` | Required for JWT signing. |
| `SESSION_ENCRYPTION_KEY` | 32-byte hex key used to encrypt SEMS tokens at rest. |
| `ENABLE_SAMPLER` | `false` if you run multiple replicas — only one should sample. |

## Architecture

```
src/lib/solar/
  port.ts          # SolarDataPort interface — the only thing routes import
  types.ts         # Domain types
  sems-client.ts   # Low-level SEMS HTTP/auth/region routing
  sems-schemas.ts  # Tolerant zod parsers
  sems-adapter.ts  # SolarDataPort implementation backed by SEMS
  mock-adapter.ts  # SolarDataPort implementation with seeded synthetic data
  adapter.ts       # Env-driven factory
  repository.ts    # Prisma read/write for history + alerts
src/workers/sampler.ts   # 60s in-process cron that fills the history table
src/instrumentation.ts   # Boots the sampler when Next.js starts
```

Concurrent dashboard tabs collapse to a single SEMS call via the in-memory TTL
cache (`src/lib/cache.ts`). Sub-30s polling has been reported to invalidate
SEMS tokens, so realtime is capped at 30s client-side and 25s server-cache.

## Day-one calibration

After your first real login, do this 5-minute sanity check:

1. **Battery sign** — at noon with sun shining, charging should display as a
   positive flow into the battery. If shown as discharge, set
   `SEMS_BATTERY_SIGN=inverted`.
2. **Grid sign** — exporting to grid should display as `flow: out`. Set
   `SEMS_GRID_SIGN=inverted` if reversed.
3. **Region host** — the sampler logs the host returned by CrossLogin on
   first run. Pin it via `SEMS_REGION` to avoid the redirect dance.

## Known SEMS gotchas

- Logging into the SEMS web portal with the same account **invalidates the
  dashboard's session**. Use a dedicated account if possible.
- `tempperature` is a real upstream field name. Don't "fix" the typo.
- Schemas drift between v1/v2/v3. The zod parsers stay tolerant; unknown
  fields are logged but don't reject.
- `code: 100001` = token expired (auto re-login + retry). `code: 100002` =
  wrong region (auto follow `components.api`).

## Scripts

```bash
pnpm dev          # start the Next.js dev server
pnpm build        # prisma generate + next build
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
pnpm db:migrate   # prisma migrate dev
pnpm db:studio    # prisma studio
```

## License

Private project.
