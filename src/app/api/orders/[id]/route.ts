import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError } from "@/lib/route-helpers";
import { getOrder } from "@/lib/services/order.service";

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const auth = await authorize([
      UserRole.CUTTING_SUPERVISOR,
      UserRole.CUTTING_VERIFIER,
    ]);
    if (!auth.ok) {
      return auth.res;
    }
    const { id } = await params;
    const order = await getOrder(id);

    return successResponse("Order retrieved", order);
  } catch (e) {
    return handleError(e, "GET_ORDER_ERROR");
  }
};
