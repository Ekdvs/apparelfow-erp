# ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal

Webtezza (Pvt) Ltd — Software Engineering Intern Assessment.

A full-stack implementation of the garment-factory checkpoint that guarantees **no unverified, mismatched or short batch ever reaches the Sewing Queue**. The rule is enforced on the server, not the UI.

- **Live:** https://apparelfow-erp.vercel.app/
- **Repo:** https://github.com/Ekdvs/apparelfow-erp
- **AI report:** [AI_OPTIMIZATION_REPORT.md](./AI_OPTIMIZATION_REPORT.md)

---

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Cutting Supervisor | `supervisor@apparelflow.demo` | `Supervisor@123` |
| Cutting Verifier | `verifier@apparelflow.demo` | `Verifier@123` |
| Sewing Supervisor | `sewing@apparelflow.demo` | `Sewing@123` |

The login page has a **Demo credentials panel** with "Fill form" and one-click "Login as …" buttons for each persona. Use Logout in the navbar to switch roles.

---

## Tech stack

- **Framework:** Next.js (App Router, route handlers) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 (explicit high-contrast tokens in `lib/ui.ts`)
- **Database:** PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)
- **Auth:** bcrypt password hashes, JWT in an `httpOnly` cookie (30 min)
- **Validation:** Zod (server) + matching client validators
- **Tests:** Vitest (unit + integration against a real PostgreSQL test DB)
- **Hosting:** Vercel

---

## Workflow / state machine

```
Supervisor creates order
        │
        ▼
PENDING_VERIFICATION ──(Verifier: Reject + mandatory reason)──► REJECTED
        │  ▲                                                       │
        │  └────────────(Supervisor: Resubmit, counts wiped)───────┘
        │
 (Verifier: Approve — only if every component is GREEN/YELLOW and counted)
        ▼
     VERIFIED  ──(Sewing Supervisor: Start Sewing)──►  IN_SEWING
```

Only these four transitions are legal; everything else returns `409`. See `lib/domain/state-machine.ts`.

### Traffic lights (`lib/domain/traffic-light.ts`)

| Flag | Condition | Effect |
|---|---|---|
| GREEN | actual == expected | OK |
| YELLOW | actual > expected | Surplus, batch may proceed |
| RED | actual < expected | **Approval blocked** |
| (uncounted) | no count saved | **Approval blocked** |

### Wastage

`Wastage % = ((actual fabric − expected fabric) ÷ expected fabric) × 100`, where `expected fabric = std yards/piece × target qty`. Stored on every `VerificationLog`.

---

## Roles & permissions (enforced server-side)

| Endpoint | Supervisor | Verifier | Sewing |
|---|:-:|:-:|:-:|
| `GET /api/recipes` | ✅ | ✅ | ❌ 403 |
| `GET /api/orders`, `GET /api/orders/:id` | ✅ | ✅ | ❌ 403 |
| `POST /api/orders` (create) | ✅ | ❌ 403 | ❌ 403 |
| `POST /api/orders/:id/resubmit` | ✅ | ❌ 403 | ❌ 403 |
| `PATCH /api/orders/:id/counts` | ❌ 403 | ✅ | ❌ 403 |
| `POST /api/orders/:id/approve` | ❌ 403 | ✅ | ❌ 403 |
| `POST /api/orders/:id/reject` | ❌ 403 | ✅ | ❌ 403 |
| `GET /api/sewing/queue` | ❌ 403 | ❌ 403 | ✅ |
| `POST /api/sewing/:id/start` | ❌ 403 | ❌ 403 | ✅ |

Unauthenticated requests receive `401`.

---

## Security model

1. **Server-side RBAC.** Every route calls `authorize([roles])`. The role is read from the **database** on every request (JWT carries only `userId`/`email`), so a stale or forged role claim is useless.
2. **Hard stop.** `approveOrder` recomputes each light from raw `expectedQty`/`actualQty` and never trusts the stored `status` column. Any RED or uncounted component → `422` with a `blockers` list.
3. **Query isolation.** `getSewingQueue` uses `where: { status: "VERIFIED" }` at the database level and ignores query-string input entirely.
4. **Authenticated context.** Verifier ID and timestamps come from the session and DB default — never from the request body. Zod schemas are `.strict()`, so extra fields (`verifierId`, `status`, `createdBy`) are rejected with `422`.
5. **Atomic transitions.** Approve/reject/resubmit/start-sewing use `updateMany({ where: { id, status: <expected> } })` inside a transaction; concurrent requests produce exactly one winner (`409` for the loser).
6. **Immutable audit trail.** Decisions are written to `VerificationLog` in the same transaction as the status change. An optional PostgreSQL trigger (`verification_log_immutable`) blocks `UPDATE`/`DELETE` on the log; the test suite verifies it when present.
7. **Cookie flags.** `httpOnly`, `sameSite=lax`, `secure` in production.

---

## Database schema

```
User ──< CuttingOrder >── Recipe ──< RecipeComponent
              │                          │
              ├──< VerificationItem >────┘   (unique: orderId + componentId)
              └──< VerificationLog >── User (verifier)
```

| Table | Key columns |
|---|---|
| `User` | id, email (unique), passwordHash, role (enum), fullName, createdAt |
| `Recipe` | id, recipeCode (unique), name, category, stdFabricYards, wastageCap |
| `RecipeComponent` | id, recipeId, componentName, piecesPerGarment, imageUrl? |
| `CuttingOrder` | id, orderNo (unique), recipeId, targetQty, fabricRollId, actualFabricYds, status (enum), createdBy, sewingStartedAt/By, timestamps |
| `VerificationItem` | id, orderId, componentId, expectedQty, actualQty?, status? (GREEN/YELLOW/RED) |
| `VerificationLog` | id, orderId, verifierId, decision (APPROVED/REJECTED), rejectionNote?, wastagePct, timestamp |

Enums: `UserRole`, `CuttingOrderStatus` (PENDING_VERIFICATION, VERIFIED, REJECTED, IN_SEWING), `VerificationStatus`, `VerificationDecision`. Component variance = `actualQty − expectedQty`, stored per item and carried into the Sewing Queue.

### Seeded recipes

- **REC-BL01 Casual Blouse** — 1.8 yds/piece, cap 5.0%: Front Body ×1, Back Body ×1, Sleeves ×2, Collar & Stand ×1, Cuffs ×2
- **REC-CT02 Crop Top** — 1.1 yds/piece, cap 8.0%: Front Chest ×1, Back Support ×1, Neck Binding ×1, Hem Elastic Casing ×1, Side Strap Accents ×2

---

## Project structure

```
src/
  app/
    api/            # route handlers (auth, user, recipes, orders, sewing, health)
    (app)/          # authenticated pages: supervisor, verifier, sewing
    login/
  components/       # Modal, Field, Loader, StatusBadge, RoleGate, tables, forms
  context/          # AuthContext
  hooks/            # useOrders
  lib/
    domain/         # state-machine, traffic-light, wastage (pure, unit-tested)
    services/       # order, verification, sewing (transactions)
    validations/    # Zod schemas
    auth.ts, authorization.ts, route-helpers.ts, jwt.ts, prisma.ts
prisma/             # schema, migrations, seed
tests/              # unit/ and integration/ (+ helpers)
```

---

## Running locally

```bash
git clone https://github.com/Ekdvs/apparelfow-erp.git
cd apparelfow-erp
npm install
```

Create `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/apparelflow
JWT_ACCESS_SECRET=change-me-to-a-long-random-string
```

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev          # http://localhost:3000
```

Health check: `GET /api/health`.

---

## Tests

Integration tests call the **real route handlers** against a **real PostgreSQL database**. Only the session lookup is mocked. A guard refuses to run unless the database name contains `test`.

```bash
npm run db:test:up        # start test Postgres (docker-compose.test.yml)
# .env.test:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/apparelflow_test
# JWT_ACCESS_SECRET=test-secret
npm run db:test:migrate
npm test                  # all tests
npm run test:unit         # pure unit tests only
```

Required assessment tests:

| # | Rule | Location |
|---|---|---|
| 1 | All-GREEN order approved by Verifier | `Test 1` |
| 2 | RED / uncounted component blocks approval (422) | `Test 2` |
| 3 | Rejection without reason rejected by validation | `Test 3` |
| 4 | Non-verifier roles get 403 | `Test 4` |
| 5 | Unapproved orders never in Sewing Queue | `Test 5` |

Extra coverage: multiplier engine, input guards (negative/decimal/string/null), mass-assignment protection, double-approve, simultaneous approvals, reject → resubmit → recount → approve history, immutable log trigger, all 16 state transitions.

CI runs the suite on every push/PR against a PostgreSQL 16 service (`.github/workflows/ci.yml`).

---

## UI & accessibility

- Dark text (`gray-900`/`gray-800`) on white/light surfaces for every input, select, textarea, placeholder, disabled and focus state.
- Visible focus rings, `aria-label`s on count inputs, `role="alert"` on inline errors, `role="status"` on loaders.
- Inline validation on blur and submit: negatives, decimals, letters and empty values are rejected immediately (client) and again by Zod (server).
- Approve button is disabled with an explanatory message when any component is RED or uncounted.

---

## Deployment (Vercel)

1. Provision a PostgreSQL database (Neon / Supabase / Vercel Postgres).
2. Set `DATABASE_URL` and `JWT_ACCESS_SECRET` in Vercel project environment variables.
3. Build command: `npm run build` (runs `prisma generate && next build`).
4. Run `npx prisma migrate deploy` and `npm run db:seed` against the production database.

---

## Known limitations

- Wastage cap (`Recipe.wastageCap`) is stored and displayed but does not block approval (spec does not require it).
- No login rate limiting or CSRF token (relies on `sameSite=lax` + JSON-only endpoints).
- Recipes are seed-only; no recipe editing UI.