import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError } from "@/lib/route-helpers";
import { getSewingQueue } from "@/lib/services/sewing.service";

export const GET = async () => {
  try {
    const auth = await authorize(
      [UserRole.SEWING_SUPERVISOR]
    );

    if (!auth.ok) {
      return auth.res;
    }

    const sewingQueue = await getSewingQueue();

    return successResponse("Sewing queue retrieved", sewingQueue);
  } catch (e) {
    return handleError(e, "SEWING_QUEUE_ERROR");
  }
};
