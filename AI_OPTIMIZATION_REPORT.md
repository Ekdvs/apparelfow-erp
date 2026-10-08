# AI Optimization Report — ApparelFlow ERP

Candidate: Vishwa (Ekdvs) · Project: Cutting Operations & Gatekeeper Verification Terminal · Repo: https://github.com/Ekdvs/apparelfow-erp

---

## 1. Tools & Prompting

| Tool | Used for |
|---|---|
| Claude (chat) | Reading the spec, schema review, service-layer review, integration test design, README/report drafting |
| GitHub Copilot / IDE completion | Boilerplate (Tailwind class strings, repetitive route handlers, Zod messages) |

**Prompting approach**

- Fed the full assessment PDF as context so the model could not invent requirements.
- Asked for one layer at a time (schema → domain functions → services → routes → UI) instead of "build the app", so each layer could be reviewed before the next depended on it.
- Asked the model to *attack* its own output ("how would a cURL user bypass this?") for every endpoint and for the approve flow.
- Never accepted generated code without running it; every rule in the spec has a failing-then-passing test.

**Not delegated to AI:** the decision to put all rules in a service layer behind `authorize()`, the choice to recompute lights from raw numbers, and the final security review.

---

## 2. Flawed / Broken AI Code

### 2.1 RBAC trusted the client / stored role (security)
**AI output:** the first auth draft put `role` inside the JWT and let route handlers and the UI `RoleGate` read it. `RoleGate` hides pages client-side only.
**Problem:** a role in a long-lived signed token goes stale (a demoted user keeps the privilege until expiry), and UI gating is cosmetic — a direct `POST /api/orders/:id/approve` from the supervisor would have depended entirely on the token claim.
**Fix:** token carries only `userId` + `email`. `getAuthenticatedUser()` loads the role from the database on every request, and every route calls `authorize([...])` → `401`/`403`. `RoleGate` stays as UX only.

### 2.2 Hard stop trusted the stored traffic-light status (business-logic bypass)
**AI output:** `approveOrder` checked `items.some(i => i.status === "RED")`.
**Problem:** `status` is a denormalised column. Anything that changes it (a bug, a manual DB edit, a future endpoint) bypasses the gatekeeper. It also let *uncounted* items (`status = null`) through, because `null !== "RED"`.
**Fix:** approval recomputes from raw `expectedQty`/`actualQty` and treats `null` as blocking (`isBlocking`). A dedicated test flips every stored status to `GREEN` directly in the DB and confirms approval still returns `422`.

### 2.3 Check-then-act race on status transitions (state bug)
**AI output:** `findUnique` → `if (status === "PENDING")` → `update({ status: "VERIFIED" })`.
**Problem:** two simultaneous approvals both pass the check and both write, producing duplicate audit logs.
**Fix:** transitions use a compare-and-set: `updateMany({ where: { id, status: "PENDING_VERIFICATION" } })` and abort with `409` if `count === 0`, inside one `$transaction` that also writes the log. Test: two parallel approvals → exactly `[200, 409]` and one log row.

### 2.4 Mass assignment / client-supplied identity
**AI output:** `body` was passed straight into `prisma.cuttingOrder.create({ data: body })`, and the first approve draft accepted `verifierId` from the body.
**Problem:** a client could set `status: "VERIFIED"`, `createdBy`, or forge the verifier and timestamp — violating the "never trust client bodies" rule.
**Fix:** `.strict()` Zod schemas on every body, explicit field mapping in services, verifier ID from the session, timestamp from `@default(now())`. Tests post `verifierId`, `status`, `createdBy` and expect `422`.

### 2.5 Brittle numeric coercion and weak validation (input)
**AI output:** `Number(value)` and `parseInt` on form fields, `z.coerce.number()` on the server.
**Problem:** `Number("")` is `0`, `Number("1e3")` is `1000`, `parseInt("5abc")` is `5`, and `z.coerce` turns `"50"`, `null` and `""` into numbers — so negatives, decimals and junk slipped through the "defensive input" requirement.
**Fix:** client validators use strict regexes (`/^\d+$/`, `/^\d+(\.\d{1,2})?$/`) *before* converting; server schemas use real `z.number().int().min(0)` (no coercion), so `"10"` and `null` are rejected. Unit tests cover `""`, `"-5"`, `"2.5"`, `"abc"`, `"1e3"`, `"1,000"`.

### 2.6 Unsafe `null` handling in the traffic-light function
**AI output:** `evaluateStatus(expected: number, actual: number)` with an `if (actual === null)` branch.
**Problem:** the type signature says `null` is impossible while the body handles it, so callers get no type help and a stray `null` compares as `actual < expected` → wrongly RED on the client or crashes elsewhere.
**Status:** server path guards `actualQty === null` before calling it; the client `evaluate()` is only called after validation passes. Tracked as a follow-up to widen the signature to `number | null`.

### 2.7 Contrast defects (UI)
**AI output:** Tailwind defaults such as `text-gray-400` placeholders, `text-gray-500` helper text, and inputs with no explicit `bg`/`text` colour.
**Problem:** the spec calls out white-on-white inputs as a zero-tolerance defect; dark-mode OS settings can also flip browser defaults for `<select>` and `<textarea>`.
**Fix:** one source of truth in `lib/ui.ts` — every input sets `bg-white text-gray-900 placeholder:text-gray-500`, explicit disabled and focus-ring styles; helper/body text is `gray-700`+; badges use `*-100` background with `*-900` text.

### 2.8 Effect / state-sync smells
**AI output:** data-fetch `useEffect`s duplicated the loader function (`SewingPage`), the verifier terminal had no cancellation guard, and a `setTimeout(…, 0)` wrapper appeared around `reload()` to silence a lint rule.
**Problem:** state updates after unmount, duplicated logic that can drift, and a timer hack that hides rather than fixes the issue.
**Fix:** cancellation flags in effects, a single `reload` callback for mutations, loading/busy flags (`busy: null | "save" | "approve" | "reject"`) that disable every action while a request is in flight to stop double submits.

---

## 3. Human Refactoring

- **Layering.** Route handlers only do `authorize → parseBody → service → respond`. Business rules live in `lib/services/*` and pure functions in `lib/domain/*`, so they are unit-testable without HTTP.
- **Single error path.** `DomainError(message, status, details)` + `handleError` produce consistent envelopes (`{ success, message, data, error }`) and never leak stack traces (`500` returns a generic message).
- **Save-then-decide approval.** The UI saves counts and then calls `approve`; the server decides purely from persisted counts. The client's traffic light is a convenience, not an authority.
- **Atomic audit.** Status change and `VerificationLog` insert happen in one transaction; reject also stores the wastage so the history is complete.
- **Resubmit semantics.** Resubmission wipes counts (`actualQty = null`) so a re-cut batch must be recounted, while old decisions remain in the log.
- **Test strategy.** Rather than mocking Prisma, integration tests call the real route handlers against a real PostgreSQL database. Only the session lookup is mocked. A `assertTestDatabase()` guard refuses to run on any database whose name does not contain `test`.
- **Immutable log.** Added a PostgreSQL trigger to block `UPDATE`/`DELETE` on `VerificationLog`, with a test that proves the database (not the app) refuses tampering.
- **Cleanup.** Removed unused packages and moved shared styling into `lib/ui.ts` to eliminate per-component colour drift.

---

## 4. Defensive Architecture

### State machine
`lib/domain/state-machine.ts` is a whitelist map:

```
PENDING_VERIFICATION → VERIFIED | REJECTED
REJECTED             → PENDING_VERIFICATION
VERIFIED             → IN_SEWING
IN_SEWING            → (terminal)
```

`assertTransition(from, to)` throws `409` for anything else. All 16 `from × to` pairs are tested. Because every transition is also a compare-and-set on the current status, a stale or replayed request cannot move an order twice.

### Layers of defence for the hard stop

| Layer | Control |
|---|---|
| Authentication | httpOnly JWT cookie, user re-fetched from DB each request |
| Authorization | `authorize([role])` on every route → `401` / `403` |
| Validation | `.strict()` Zod schemas → `422`; JSON parse failure → `400` |
| Business rule | `approveOrder` recomputes lights from raw counts; any RED/uncounted → `422` + `blockers[]` |
| State | `assertTransition` + `updateMany` compare-and-set → `409` |
| Data | Transactional audit write; DB trigger blocks log edits; unique `(orderId, componentId)` |
| Query isolation | `getSewingQueue` hardcodes `where: { status: "VERIFIED" }`; handler ignores URL params |
| UI (cosmetic only) | Disabled Approve button, `RoleGate`, inline errors |

### Test evidence (`npm test`)
- Required tests 1–5 present and passing.
- Tamper tests: stored status forced to GREEN, extra body fields, mass assignment, edits after approval.
- Concurrency: simultaneous approvals → one success.
- Roles: 401 unauthenticated, 403 for every wrong-role endpoint, and separation of duties in both directions.

### Residual risks (honest list)
- No login rate limiting / lockout.
- CSRF protection relies on `sameSite=lax` and JSON-only endpoints (no token).
- `wastageCap` is displayed but does not gate approval (not required by spec).
- `evaluateStatus` type signature still needs widening to `number | null` (see 2.6).

---

### Lessons
AI was fastest at scaffolding and test volume, and consistently weakest at *adversarial* thinking: it implemented the happy path of every rule and left the bypass to me. The valuable work was asking "what does a cURL user send?" for each endpoint and encoding the answer as a test.