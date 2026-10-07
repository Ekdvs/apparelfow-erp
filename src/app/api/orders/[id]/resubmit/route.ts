import { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError, parseBody } from "@/lib/route-helpers";
import { resubmitSchema } from "@/lib/validations/order.validation";
import { resubmitOrder } from "@/lib/services/order.service";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const auth = await authorize(
      [UserRole.CUTTING_SUPERVISOR]
    );

    if (!auth.ok) {
      return auth.res;
    }

    const { id } = await params;
    const { actualFabricYds } = await parseBody(request, resubmitSchema);
    const order = await resubmitOrder(id, actualFabricYds);

    return successResponse(
      "Order resubmitted for verification",
      order,
    );
  } catch (e) {
    return handleError(e, "RESUBMIT_ERROR");
  }
};
