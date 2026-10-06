import { errorResponse, successResponse } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return errorResponse(
        "Unauthorized",
        null,
        401,
      );
    }

    return successResponse(
      "User retrieved successfully",
      user,
      200,
    );
  } catch (error) {
    console.error("GET_ME_ERROR:", error);

    return errorResponse(
      "Internal server error",
      null,
      500,
    );
  }
}

