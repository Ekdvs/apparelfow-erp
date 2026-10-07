import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors";

export const getSewingQueue = () =>
  prisma.cuttingOrder.findMany({
    where: { status: "VERIFIED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      targetQty: true,
      fabricRollId: true,
      actualFabricYds: true,
      status: true,
      recipe: { select: { recipeCode: true, name: true } },
      verificationItems: {
        select: {
          expectedQty: true,
          actualQty: true,
          status: true,
          component: { select: { componentName: true } },
        },
      },
      verificationLogs: {
        where: { decision: "APPROVED" },
        orderBy: { timestamp: "desc" },
        take: 1,
        select: {
          timestamp: true,
          wastagePct: true,
          verifier: { select: { fullName: true } },
        },
      },
    },
  });

export async function startSewing(orderId: string, userId: string) {
  const claimed = await prisma.cuttingOrder.updateMany({
    where: { id: orderId, status: "VERIFIED" },
    data: {
      status: "IN_SEWING",
      sewingStartedAt: new Date(),
      sewingStartedBy: userId,
    },
  });

  if (claimed.count === 0)
    throw new DomainError("Order not found in sewing queue", 404);
  return { orderId, status: "IN_SEWING" as const };
}
