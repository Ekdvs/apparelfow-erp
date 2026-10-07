import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors";
import { calcWastagePct } from "@/lib/domain/wastage";
import { assertTransition } from "@/lib/domain/state-machine";
import { evaluateStatus, isBlocking } from "../domain/traffic-light";

export async function saveCounts(
  orderId: string,
  counts: { componentId: string; actualQty: number }[],
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: { verificationItems: true },
    });
    if (!order) throw new DomainError("Order not found", 404);
    if (order.status !== "PENDING_VERIFICATION")
      throw new DomainError(
        "Counts can only be edited while pending verification",
        409,
      );

    const items = new Map(
      order.verificationItems.map((i) => [i.componentId, i]),
    );
    for (const c of counts) {
      const item = items.get(c.componentId);
      if (!item)
        throw new DomainError("Component does not belong to this order", 422);
      await tx.verificationItem.update({
        where: { id: item.id },

        data: {
          actualQty: c.actualQty,
          status: evaluateStatus(item.expectedQty, c.actualQty),
        },
      });
    }
    return tx.verificationItem.findMany({
      where: { orderId },
      include: { component: { select: { componentName: true } } },
    });
  });
}

export async function approveOrder(orderId: string, verifierId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: {
        recipe: true,
        verificationItems: { include: { component: true } },
      },
    });
    if (!order) throw new DomainError("Order not found", 404);
    assertTransition(order.status, "VERIFIED");

    if (order.verificationItems.length === 0)
      throw new DomainError("Order has no components to verify", 422);

    // HARD STOP: recompute from raw numbers, don't trust stored status
    const blockers = order.verificationItems
      .filter(
        (i) =>
          i.actualQty === null ||
          isBlocking(evaluateStatus(i.expectedQty, i.actualQty)),
      )
      .map((i) => ({
        component: i.component.componentName,
        expected: i.expectedQty,
        actual: i.actualQty,
        reason: i.actualQty === null ? "UNCOUNTED" : "SHORTAGE",
      }));
    if (blockers.length > 0)
      throw new DomainError(
        "Approval blocked: shortage or uncounted components",
        422,
        { blockers },
      );

    const wastagePct = calcWastagePct(
      order.actualFabricYds,
      order.recipe.stdFabricYards,
      order.targetQty,
    );

    const claimed = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "PENDING_VERIFICATION" },
      data: { status: "VERIFIED" },
    });
    if (claimed.count === 0)
      throw new DomainError("Order state changed, retry", 409);

    const log = await tx.verificationLog.create({
      data: { orderId, verifierId, decision: "APPROVED", wastagePct },
    });
    return { orderId, status: "VERIFIED" as const, log };
  });
}

export async function rejectOrder(
  orderId: string,
  verifierId: string,
  reason: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: { recipe: true },
    });
    if (!order) throw new DomainError("Order not found", 404);
    assertTransition(order.status, "REJECTED");

    const claimed = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "PENDING_VERIFICATION" },
      data: { status: "REJECTED" },
    });
    if (claimed.count === 0)
      throw new DomainError("Order state changed, retry", 409);

    const wastagePct = calcWastagePct(
      order.actualFabricYds,
      order.recipe.stdFabricYards,
      order.targetQty,
    );
    const log = await tx.verificationLog.create({
      data: {
        orderId,
        verifierId,
        decision: "REJECTED",
        rejectionNote: reason,
        wastagePct,
      },
    });
    return { orderId, status: "REJECTED" as const, log };
  });
}
