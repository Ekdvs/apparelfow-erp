import { config } from "dotenv";
import { afterEach, vi } from "vitest";

config({ path: ".env.test", override: true });
process.env.JWT_ACCESS_SECRET ??= "test-only-secret";

type Global = { __TEST_USER__?: unknown };


vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: async () => (globalThis as Global).__TEST_USER__ ?? null,
}));

afterEach(() => {
  (globalThis as Global).__TEST_USER__ = null;
});