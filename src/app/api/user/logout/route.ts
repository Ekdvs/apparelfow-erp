import { errorResponse, successResponse } from "@/lib/api-response";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return successResponse(
      "Logout successful",
      null,
      200,
    );
  } catch (error) {
    console.error("LOGOUT_ERROR:", error);

    return errorResponse(
      "Internal server error",
      null,
      500,
    );
  }
}

