import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError } from "@/lib/route-helpers";
import { approveOrder } from "@/lib/services/verification.service";

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const auth = await authorize([UserRole.CUTTING_VERIFIER]);
    if (!auth.ok) {
      return auth.res;
    }

    const { id } = await params;

    const approvalResult = await approveOrder(id, auth.user.id);

    return successResponse(
      "Batch verified and released to sewing",
      approvalResult,
    );
  } catch (e) {
    return handleError(e, "APPROVE_ERROR");
  }
};
