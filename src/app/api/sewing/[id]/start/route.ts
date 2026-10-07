import { UserRole } from "@/generated/prisma/enums";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError } from "@/lib/route-helpers";
import { startSewing } from "@/lib/services/sewing.service";

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const auth = await authorize(
      [UserRole.SEWING_SUPERVISOR]
    );

    if (!auth.ok) {
      return auth.res;
    }

    const { id } = await params;
    const sewing = await startSewing(id, auth.user.id);

    return successResponse("Sewing assembly started", sewing);
  } catch (e) {
    return handleError(e, "START_SEWING_ERROR");
  }
};
