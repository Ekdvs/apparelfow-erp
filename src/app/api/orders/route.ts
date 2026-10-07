import { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError, parseBody } from "@/lib/route-helpers";
import { createOrderSchema } from "@/lib/validations/order.validation";
import { createOrder, listOrders } from "@/lib/services/order.service";

export const GET = async () => {
  try {
    const auth = await authorize([
      UserRole.CUTTING_SUPERVISOR,
      UserRole.CUTTING_VERIFIER,
    ]);
    if (!auth.ok){
      return auth.res;
    } 

    const orders = await listOrders();

    return successResponse("Orders retrieved", orders);
  } catch (e) {
    return handleError(e, "LIST_ORDERS_ERROR");
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const auth = await authorize(
      [UserRole.CUTTING_SUPERVISOR]
    );

    if (!auth.ok) {
      return auth.res;
    }

    const input = await parseBody(request, createOrderSchema);

  

    return successResponse(
      "Cutting order created",
      await createOrder(auth.user.id, input),
      201,
    );
  } catch (e) {
    return handleError(e, "CREATE_ORDER_ERROR");
  }
};
