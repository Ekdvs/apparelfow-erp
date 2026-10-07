import { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError, parseBody } from "@/lib/route-helpers";
import { rejectSchema } from "@/lib/validations/order.validation";
import { rejectOrder } from "@/lib/services/verification.service";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const auth = await authorize(
      [UserRole.CUTTING_VERIFIER]
    );

    if (!auth.ok) {
      return auth.res;
    }

    const { id } = await params;
    const { reason } = await parseBody(request, rejectSchema);
    const order = await rejectOrder(id, auth.user.id, reason);
    
    return successResponse(
      "Batch rejected",
      order,
    );
  } catch (e) {
    return handleError(e, "REJECT_ERROR");
  }
};
