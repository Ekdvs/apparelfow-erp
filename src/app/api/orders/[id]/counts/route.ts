import { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError, parseBody } from "@/lib/route-helpers";
import { countsSchema } from "@/lib/validations/order.validation";
import { saveCounts } from "@/lib/services/verification.service";

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const auth = await authorize([UserRole.CUTTING_VERIFIER]);

    if (!auth.ok) {
      return auth.res;
    }

    const { id } = await params;

    const { counts } = await parseBody(request, countsSchema);

    const orderCounts = await saveCounts(id, counts);

    return successResponse("Counts saved", orderCounts);
  } catch (e) {
    return handleError(e, "SAVE_COUNTS_ERROR");
  }
};
