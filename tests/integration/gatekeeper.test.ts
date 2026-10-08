import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSewingQueue } from "@/lib/services/sewing.service";
import { assertTestDatabase, resetOrders, seedFixtures, type Fixtures } from "../helpers/db";
import { actAs } from "../helpers/session";
import { api, approvedOrder, exactCounts, newPendingOrder, type OrderItem } from "../helpers/scenario";

let fx: Fixtures;

beforeAll(async () => {
  assertTestDatabase();
  fx = await seedFixtures();
});

beforeEach(async () => {
  await resetOrders();
});

afterAll(async () => {
  await resetOrders();
  await prisma.$disconnect();
});

const statusOf = async (id: string) => (await prisma.cuttingOrder.findUniqueOrThrow({ where: { id } })).status;
const logCount = (orderId: string) => prisma.verificationLog.count({ where: { orderId } });

/* ------------------------------------------------------------------ */
/* REQUIRED TEST 1                                                     */
/* ------------------------------------------------------------------ */
describe("Test 1: all GREEN components can be approved by an authenticated Verifier", () => {
  it("approves, moves to VERIFIED and writes the audit record", async () => {
    const order = await newPendingOrder(fx, { qty: 10, yards: 21 });

    actAs(fx.verifier);
    const saved = await api.saveCounts(order.id, exactCounts(order.items));
    expect(saved.status).toBe(200);
    expect(saved.body.data.every((i: { status: string }) => i.status === "GREEN")).toBe(true);

    const res = await api.approve(order.id);
    expect(res.status).toBe(200);
    expect(await statusOf(order.id)).toBe("VERIFIED");

    const logs = await prisma.verificationLog.findMany({ where: { orderId: order.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ decision: "APPROVED", verifierId: fx.verifier.id });
    expect(logs[0].wastagePct).toBeCloseTo(5, 2); // (21 - 2x10) / 20 x 100
    expect(logs[0].timestamp).toBeInstanceOf(Date);
  });

  it("YELLOW (excess) does not block approval", async () => {
    const order = await newPendingOrder(fx);
    const counts = exactCounts(order.items);
    counts[0].actualQty += 3;

    actAs(fx.verifier);
    await api.saveCounts(order.id, counts);
    expect((await api.approve(order.id)).status).toBe(200);
  });

  it("verifier identity comes from the session, never from the request body", async () => {
    const order = await newPendingOrder(fx);
    actAs(fx.verifier);
    await api.saveCounts(order.id, exactCounts(order.items));

    const res = await api.approve(order.id, { verifierId: fx.supervisor.id, timestamp: "2000-01-01" });
    expect(res.status).toBe(200);

    const log = await prisma.verificationLog.findFirstOrThrow({ where: { orderId: order.id } });
    expect(log.verifierId).toBe(fx.verifier.id);
    expect(log.timestamp.getFullYear()).toBeGreaterThan(2000);
  });
});

/* ------------------------------------------------------------------ */
/* REQUIRED TEST 2                                                     */
/* ------------------------------------------------------------------ */
describe("Test 2: a RED (shortage) component blocks approval", () => {
  it("returns 422, keeps the order PENDING and writes no audit record", async () => {
    const order = await newPendingOrder(fx);
    const counts = exactCounts(order.items);
    counts[1].actualQty -= 1; // one piece short

    actAs(fx.verifier);
    const saved = await api.saveCounts(order.id, counts);
    expect(saved.body.data.some((i: { status: string }) => i.status === "RED")).toBe(true);

    const res = await api.approve(order.id);
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.blockers[0].reason).toBe("SHORTAGE");

    expect(await statusOf(order.id)).toBe("PENDING_VERIFICATION");
    expect(await logCount(order.id)).toBe(0);
  });

  it("returns 422 when components are uncounted", async () => {
    const order = await newPendingOrder(fx);
    actAs(fx.verifier);

    const res = await api.approve(order.id);
    expect(res.status).toBe(422);
    expect(res.body.error.blockers).toHaveLength(order.items.length);
    expect(res.body.error.blockers[0].reason).toBe("UNCOUNTED");
  });

  it("returns 422 when only some components are counted", async () => {
    const order = await newPendingOrder(fx);
    actAs(fx.verifier);
    await api.saveCounts(order.id, exactCounts(order.items).slice(0, 1));

    expect((await api.approve(order.id)).status).toBe(422);
    expect(await statusOf(order.id)).toBe("PENDING_VERIFICATION");
  });

  it("recomputes from raw counts, so a tampered stored status cannot bypass the hard stop", async () => {
    const order = await newPendingOrder(fx);
    const counts = exactCounts(order.items);
    counts[0].actualQty = 0; // big shortage

    actAs(fx.verifier);
    await api.saveCounts(order.id, counts);

    // Simulate someone editing the database/status column directly
    await prisma.verificationItem.updateMany({ where: { orderId: order.id }, data: { status: "GREEN" } });

    expect((await api.approve(order.id)).status).toBe(422);
    expect(await statusOf(order.id)).toBe("PENDING_VERIFICATION");
  });
});

/* ------------------------------------------------------------------ */
/* REQUIRED TEST 3                                                     */
/* ------------------------------------------------------------------ */
describe("Test 3: rejecting without a reason note is rejected by backend validation", () => {
  it.each([
    ["missing reason field", {}, 422],
    ["empty reason", { reason: "" }, 422],
    ["whitespace-only reason", { reason: "      " }, 422],
    ["too-short reason", { reason: "no" }, 422],
    ["non-string reason", { reason: 12345 }, 422],
    ["client-supplied verifierId (strict schema)", { reason: "Valid reason here", verifierId: "x" }, 422],
    ["no body at all", undefined, 400],
  ])("%s -> %i", async (_label, body, expectedStatus) => {
    const order = await newPendingOrder(fx);
    actAs(fx.verifier);

    const res = await api.reject(order.id, body);
    expect(res.status).toBe(expectedStatus);
    expect(res.body.success).toBe(false);

    expect(await statusOf(order.id)).toBe("PENDING_VERIFICATION");
    expect(await logCount(order.id)).toBe(0);
  });

  it("a valid reason rejects the order and stores the note against the verifier", async () => {
    const order = await newPendingOrder(fx);
    actAs(fx.verifier);

    const res = await api.reject(order.id, { reason: "  Sleeve shortage, 10 pieces missing  " });
    expect(res.status).toBe(200);
    expect(await statusOf(order.id)).toBe("REJECTED");

    const log = await prisma.verificationLog.findFirstOrThrow({ where: { orderId: order.id } });
    expect(log).toMatchObject({
      decision: "REJECTED",
      rejectionNote: "Sleeve shortage, 10 pieces missing",
      verifierId: fx.verifier.id,
    });
  });
});

/* ------------------------------------------------------------------ */
/* REQUIRED TEST 4                                                     */
/* ------------------------------------------------------------------ */
describe("Test 4: non-verifier roles receive 403 when attempting verification", () => {
  describe.each([
    ["cutting supervisor", () => fx.supervisor],
    ["sewing supervisor", () => fx.sewing],
  ])("as %s", (_label, who) => {
    it("gets 403 on approve, reject and save-counts, and nothing changes", async () => {
      const order = await newPendingOrder(fx);
      actAs(who());

      const approve = await api.approve(order.id);
      const reject = await api.reject(order.id, { reason: "Trying to reject without permission" });
      const counts = await api.saveCounts(order.id, exactCounts(order.items));

      expect(approve.status).toBe(403);
      expect(reject.status).toBe(403);
      expect(counts.status).toBe(403);

      expect(await statusOf(order.id)).toBe("PENDING_VERIFICATION");
      expect(await logCount(order.id)).toBe(0);
      expect(await prisma.verificationItem.count({ where: { orderId: order.id, actualQty: { not: null } } })).toBe(0);
    });
  });

  it("an unauthenticated request gets 401", async () => {
    const order = await newPendingOrder(fx);
    actAs(null);

    expect((await api.approve(order.id)).status).toBe(401);
    expect((await api.reject(order.id, { reason: "No session at all" })).status).toBe(401);
    expect((await api.queue()).status).toBe(401);
  });

  it("separation of duties also holds the other way", async () => {
    actAs(fx.verifier);
    const create = await api.createOrder({
      recipeId: fx.recipeId,
      targetQty: 10,
      fabricRollId: "FAB-X",
      actualFabricYds: 20,
    });
    expect(create.status).toBe(403);
    expect(await prisma.cuttingOrder.count()).toBe(0);

    const order = await approvedOrder(fx);
    expect((await api.startSewing(order.id)).status).toBe(403); // verifier cannot start sewing
    expect((await api.queue()).status).toBe(403); // verifier cannot see the sewing queue

    actAs(fx.supervisor);
    expect((await api.queue()).status).toBe(403); // supervisor cannot see the sewing queue
    expect((await api.resubmit(order.id)).status).not.toBe(200);
  });
});

/* ------------------------------------------------------------------ */
/* REQUIRED TEST 5                                                     */
/* ------------------------------------------------------------------ */
describe("Test 5: unapproved orders never appear in the Sewing Queue", () => {
  it("returns only VERIFIED orders, ignoring query-string manipulation", async () => {
    const pending = await newPendingOrder(fx);

    const rejected = await newPendingOrder(fx);
    actAs(fx.verifier);
    await api.reject(rejected.id, { reason: "Fabric defect on roll" });

    const verified = await approvedOrder(fx);

    const inSewing = await approvedOrder(fx);
    actAs(fx.sewing);
    expect((await api.startSewing(inSewing.id)).status).toBe(200);

    // Sanity: all four statuses really exist in the database
    expect(await prisma.cuttingOrder.count()).toBe(4);

    actAs(fx.sewing);
    const res = await api.queue("http://localhost/api/sewing/queue?status=PENDING_VERIFICATION&all=true&includeRejected=1");
    expect(res.status).toBe(200);

    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).toEqual([verified.id]);
    expect(ids).not.toContain(pending.id);
    expect(ids).not.toContain(rejected.id);
    expect(ids).not.toContain(inSewing.id);
    expect(res.body.data.every((o: { status: string }) => o.status === "VERIFIED")).toBe(true);

    // The database-level query itself, without the HTTP layer
    const direct = await getSewingQueue();
    expect(direct.map((o) => o.id)).toEqual([verified.id]);
  });

  it("an empty system returns an empty queue", async () => {
    await newPendingOrder(fx);
    actAs(fx.sewing);
    const res = await api.queue();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("carries verifier attribution and wastage into the queue", async () => {
    await approvedOrder(fx, { qty: 10, yards: 21 });
    actAs(fx.sewing);

    const [order] = (await api.queue()).body.data;
    expect(order.verificationLogs[0].verifier.fullName).toBe("Test Verifier");
    expect(order.verificationLogs[0].wastagePct).toBeCloseTo(5, 2);
    expect(order.verificationItems).toHaveLength(3);
  });

  it("start-sewing only works on VERIFIED orders (404 otherwise, nothing changes)", async () => {
    const pending = await newPendingOrder(fx);
    actAs(fx.sewing);

    expect((await api.startSewing(pending.id)).status).toBe(404);
    expect(await statusOf(pending.id)).toBe("PENDING_VERIFICATION");

    const verified = await approvedOrder(fx);
    actAs(fx.sewing);
    expect((await api.startSewing(verified.id)).status).toBe(200);

    const row = await prisma.cuttingOrder.findUniqueOrThrow({ where: { id: verified.id } });
    expect(row.status).toBe("IN_SEWING");
    expect(row.sewingStartedBy).toBe(fx.sewing.id);
    expect(row.sewingStartedAt).toBeInstanceOf(Date);

    expect((await api.startSewing(verified.id)).status).toBe(404); // already started
  });
});

/* ------------------------------------------------------------------ */
/* EXTRA: edge cases and tamper protection                             */
/* ------------------------------------------------------------------ */
describe("Order creation and multiplier engine", () => {
  it("derives expected counts as pieces-per-garment x quantity", async () => {
    const order = await newPendingOrder(fx, { qty: 50 });
    const byName = Object.fromEntries(order.items.map((i) => [i.component.componentName, i.expectedQty]));
    expect(byName).toEqual({ "Front Panel": 50, Sleeves: 100, Cuffs: 100 });

    const row = await prisma.cuttingOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.status).toBe("PENDING_VERIFICATION");
    expect(row.createdBy).toBe(fx.supervisor.id);
  });

  it.each([
    ["decimal quantity", { targetQty: 5.5 }, 422],
    ["negative quantity", { targetQty: -3 }, 422],
    ["zero quantity", { targetQty: 0 }, 422],
    ["string quantity", { targetQty: "50" }, 422],
    ["missing quantity", { targetQty: undefined }, 422],
    ["empty roll id", { fabricRollId: "" }, 422],
    ["negative fabric", { actualFabricYds: -4 }, 422],
    ["client-chosen status (mass assignment)", { status: "VERIFIED" }, 422],
    ["client-chosen creator", { createdBy: "someone-else" }, 422],
    ["invalid recipe id", { recipeId: "nope" }, 422],
    ["unknown recipe", { recipeId: randomUUID() }, 404],
  ])("rejects %s with %i and creates nothing", async (_label, patch, expectedStatus) => {
    actAs(fx.supervisor);
    const res = await api.createOrder({
      recipeId: fx.recipeId,
      targetQty: 10,
      fabricRollId: "FAB-1",
      actualFabricYds: 21,
      ...patch,
    });
    expect(res.status).toBe(expectedStatus);
    expect(await prisma.cuttingOrder.count()).toBe(0);
  });

  it("rejects an empty request body with 400", async () => {
    actAs(fx.supervisor);
    expect((await api.createOrder(undefined)).status).toBe(400);
  });
});

describe("Count validation", () => {
  const badCounts: [string, (items: OrderItem[]) => unknown][] = [
    ["negative", (i) => [{ componentId: i[0].componentId, actualQty: -1 }]],
    ["decimal", (i) => [{ componentId: i[0].componentId, actualQty: 1.5 }]],
    ["numeric string", (i) => [{ componentId: i[0].componentId, actualQty: "10" }]],
    ["null", (i) => [{ componentId: i[0].componentId, actualQty: null }]],
    ["empty list", () => []],
    ["missing counts key", () => undefined],
    ["duplicate component", (i) => [
      { componentId: i[0].componentId, actualQty: 1 },
      { componentId: i[0].componentId, actualQty: 2 },
    ]],
    ["component from another order", () => [{ componentId: randomUUID(), actualQty: 1 }]],
  ];

  it.each(badCounts)("rejects %s with 422 and stores nothing", async (_label, make) => {
    const order = await newPendingOrder(fx);
    actAs(fx.verifier);

    const res = await api.saveCounts(order.id, make(order.items));
    expect(res.status).toBe(422);
    expect(await prisma.verificationItem.count({ where: { orderId: order.id, actualQty: { not: null } } })).toBe(0);
  });

  it("counts cannot be edited after approval (409), so the audit data stays fixed", async () => {
    const order = await approvedOrder(fx);
    actAs(fx.verifier);

    const tampered = exactCounts(order.items).map((c) => ({ ...c, actualQty: 0 }));
    expect((await api.saveCounts(order.id, tampered)).status).toBe(409);

    const items = await prisma.verificationItem.findMany({ where: { orderId: order.id } });
    expect(items.every((i) => i.actualQty === i.expectedQty && i.status === "GREEN")).toBe(true);
  });

  it("unknown order ids return 404", async () => {
    actAs(fx.verifier);
    expect((await api.approve(randomUUID())).status).toBe(404);
  });
});

describe("State machine and concurrency", () => {
  it("approving twice returns 409 and writes a single audit record", async () => {
    const order = await approvedOrder(fx);
    actAs(fx.verifier);

    expect((await api.approve(order.id)).status).toBe(409);
    expect(await logCount(order.id)).toBe(1);
  });

  it("two simultaneous approvals produce exactly one success", async () => {
    const order = await newPendingOrder(fx);
    actAs(fx.verifier);
    await api.saveCounts(order.id, exactCounts(order.items));

    const results = await Promise.all([api.approve(order.id), api.approve(order.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await logCount(order.id)).toBe(1);
  });

  it("a verified order cannot be rejected afterwards", async () => {
    const order = await approvedOrder(fx);
    actAs(fx.verifier);

    expect((await api.reject(order.id, { reason: "Changed my mind later" })).status).toBe(409);
    expect(await statusOf(order.id)).toBe("VERIFIED");
  });

  it("reject -> resubmit -> recount -> approve keeps the full history", async () => {
    const order = await newPendingOrder(fx);

    actAs(fx.verifier);
    const short = exactCounts(order.items);
    short[0].actualQty -= 2;
    await api.saveCounts(order.id, short);
    expect((await api.reject(order.id, { reason: "Front panels short by 2" })).status).toBe(200);

    // Rejected orders cannot be approved or re-counted
    expect((await api.approve(order.id)).status).toBe(409);
    expect((await api.saveCounts(order.id, short)).status).toBe(409);

    // Only the supervisor can send it back for verification
    expect((await api.resubmit(order.id)).status).toBe(403);
    actAs(fx.supervisor);
    const re = await api.resubmit(order.id, { actualFabricYds: 22 });
    expect(re.status).toBe(200);
    expect(re.body.data.status).toBe("PENDING_VERIFICATION");

    // Old counts were wiped, so the verifier must recount before approving
    const items = await prisma.verificationItem.findMany({ where: { orderId: order.id } });
    expect(items.every((i) => i.actualQty === null && i.status === null)).toBe(true);
    actAs(fx.verifier);
    expect((await api.approve(order.id)).status).toBe(422);

    await api.saveCounts(order.id, exactCounts(order.items));
    expect((await api.approve(order.id)).status).toBe(200);

    const logs = await prisma.verificationLog.findMany({ where: { orderId: order.id }, orderBy: { timestamp: "asc" } });
    expect(logs.map((l) => l.decision)).toEqual(["REJECTED", "APPROVED"]);
  });

  it("resubmitting an order that is not rejected returns 409", async () => {
    const order = await newPendingOrder(fx);
    actAs(fx.supervisor);
    expect((await api.resubmit(order.id)).status).toBe(409);
  });
});

describe("Immutable audit trail", () => {
  it("the database refuses to update or delete verification logs (requires the trigger migration)", async (ctx) => {
    const trigger = await prisma.$queryRaw<{ present: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'verification_log_immutable') AS "present"`;
    if (!trigger[0].present) return ctx.skip();

    const order = await approvedOrder(fx);
    const log = await prisma.verificationLog.findFirstOrThrow({ where: { orderId: order.id } });

    await expect(prisma.verificationLog.update({ where: { id: log.id }, data: { wastagePct: 0 } })).rejects.toThrow();
    await expect(prisma.verificationLog.delete({ where: { id: log.id } })).rejects.toThrow();
  });
});