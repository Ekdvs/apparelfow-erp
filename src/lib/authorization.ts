
import { UserRole } from "@/generated/prisma/enums";
import { getAuthenticatedUser } from "@/lib/auth";

export const requireRole = async (
  allowedRoles: UserRole[],
) => {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      error: "UNAUTHORIZED" as const,
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: "FORBIDDEN" as const,
    };
  }

  return {
    user,
    error: null,
  };
};