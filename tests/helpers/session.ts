import type { UserRole } from "@/generated/prisma/enums";

export interface TestUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export const actAs = (user: TestUser | null) => {
  (globalThis as { __TEST_USER__?: TestUser | null }).__TEST_USER__ = user;
};