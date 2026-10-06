import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifyAccessToken,
  isTokenExpired,
  isInvalidToken,
} from "@/lib/jwt";

export const getAuthenticatedUser = async () => {
  const cookieStore = await cookies();

  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    if (isTokenExpired(error)) {
      return null;
    }

    if (isInvalidToken(error)) {
      return null;
    }

    console.error("AUTH_ERROR:", error);

    return null;
  }
};
