import { CuttingOrderStatus } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/errors";

const allowed: Record<CuttingOrderStatus, CuttingOrderStatus[]> = {
  PENDING_VERIFICATION: ["VERIFIED", "REJECTED"],
  REJECTED: ["PENDING_VERIFICATION"], // supervisor re-cut and resubmit
  VERIFIED: ["IN_SEWING"],
  IN_SEWING: [],
};

export const assertTransition = (
  from: CuttingOrderStatus,
  to: CuttingOrderStatus,
) => {
  if (!allowed[from].includes(to)) {
    throw new DomainError(`Illegal status change: ${from} → ${to}`, 409);
  }
};
