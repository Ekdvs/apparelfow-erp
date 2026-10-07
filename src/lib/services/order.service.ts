import { randomBytes } from "crypto";
import { DomainError } from "../errors";
import { prisma } from "../prisma";
import { assertTransition } from "../domain/state-machine";

const orderInclude = {
  recipe: {
    select: {
      recipeCode: true,
      name: true,
      stdFabricYards: true,
      wastageCap: true,
    },
  },
  verificationItems: {
    include: { component: { select: { componentName: true, imageUrl: true } } },
  },
  verificationLogs: {
    orderBy: { timestamp: "desc" },
    take: 1,
    include: { verifier: { select: { fullName: true } } },
  },
} as const;

export const createOrder = async (
  userId: string,
  input: {
    recipeId: string;
    targetQty: number;
    fabricRollId: string;
    actualFabricYds: number;
  },
) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: input.recipeId },
    include: { components: true },
  });
  if (!recipe) throw new DomainError("Recipe not found", 404);
  if (recipe.components.length === 0)
    throw new DomainError("Recipe has no components", 422);

  return prisma.cuttingOrder.create({
    data: {
      orderNo: `CUT-${randomBytes(4).toString("hex").toUpperCase()}`,
      recipeId: recipe.id,
      targetQty: input.targetQty,
      fabricRollId: input.fabricRollId,
      actualFabricYds: input.actualFabricYds,
      createdBy: userId,
      status: "PENDING_VERIFICATION",

      verificationItems: {
        create: recipe.components.map((c) => ({
          componentId: c.id,
          expectedQty: c.piecesPerGarment * input.targetQty,
        })),
      },
    },
    include: orderInclude,
  });
};

export const listOrders = async () => {
  return prisma.cuttingOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });
};

export async function getOrder(id: string) {
  const order = await prisma.cuttingOrder.findUnique({
    where: { id },
    include: {
      ...orderInclude,
      verificationLogs: {
        orderBy: { timestamp: "desc" },
        include: { verifier: { select: { fullName: true } } },
      },
    },
  });
  if (!order) throw new DomainError("Order not found", 404);
  return order;
}

export async function resubmitOrder(id: string, actualFabricYds?: number) {
  return prisma.$transaction(async (tx) => {

    const order = await tx.cuttingOrder.findUnique(
      { where: { id } }
    );

    if (!order) {
      throw new DomainError("Order not found", 404);
    }
    
    assertTransition(order.status, "PENDING_VERIFICATION");

    // Wipe old counts so the verifier must recount; old decisions stay in VerificationLog
    await tx.verificationItem.updateMany({
      where: { orderId: id },
      data: { actualQty: null, status: null },
    });

    const claimed = await tx.cuttingOrder.updateMany({
      where: { id, status: "REJECTED" },
      data: {
        status: "PENDING_VERIFICATION",
        ...(actualFabricYds ? { actualFabricYds } : {}),
      },
    });
    if (claimed.count === 0)
      throw new DomainError("Order state changed, retry", 409);
    return tx.cuttingOrder.findUnique({ where: { id }, include: orderInclude });
  });
}
