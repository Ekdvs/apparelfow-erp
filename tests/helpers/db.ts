import bcrypt from "bcryptjs";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { TestUser } from "./session";

export interface Fixtures {
  supervisor: TestUser;
  verifier: TestUser;
  sewing: TestUser;
  recipeId: string;
}

// Safety net: never wipe tables on a non-test database
export function assertTestDatabase() {
  let dbName = "";
  try {
    dbName = new URL(process.env.DATABASE_URL ?? "").pathname;
  } catch {
    /* handled below */
  }
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run integration tests against "${dbName || "unknown"}". ` +
        `Point DATABASE_URL in .env.test at a database whose name contains "test".`,
    );
  }
}

export async function seedFixtures(): Promise<Fixtures> {
  const passwordHash = await bcrypt.hash("Test@1234", 4);

  const upsertUser = async (email: string, role: UserRole, fullName: string): Promise<TestUser> => {
    const u = await prisma.user.upsert({
      where: { email },
      update: { role, fullName, passwordHash },
      create: { email, role, fullName, passwordHash },
    });
    return { id: u.id, email: u.email, fullName: u.fullName, role: u.role };
  };

  const supervisor = await upsertUser("t-supervisor@test.local", UserRole.CUTTING_SUPERVISOR, "Test Supervisor");
  const verifier = await upsertUser("t-verifier@test.local", UserRole.CUTTING_VERIFIER, "Test Verifier");
  const sewing = await upsertUser("t-sewing@test.local", UserRole.SEWING_SUPERVISOR, "Test Sewing");

  // Std fabric 2 yds/piece, so expected fabric = 2 x qty
  const recipe = await prisma.recipe.upsert({
    where: { recipeCode: "REC-TEST" },
    update: {},
    create: { recipeCode: "REC-TEST", name: "Test Blouse", category: "Blouse", stdFabricYards: 2, wastageCap: 5 },
  });

  if ((await prisma.recipeComponent.count({ where: { recipeId: recipe.id } })) === 0) {
    await prisma.recipeComponent.createMany({
      data: [
        { recipeId: recipe.id, componentName: "Front Panel", piecesPerGarment: 1 },
        { recipeId: recipe.id, componentName: "Sleeves", piecesPerGarment: 2 },
        { recipeId: recipe.id, componentName: "Cuffs", piecesPerGarment: 2 },
      ],
    });
  }

  return { supervisor, verifier, sewing, recipeId: recipe.id };
}

// TRUNCATE is not blocked by the optional immutable-log trigger (which blocks UPDATE/DELETE)
export const resetOrders = () =>
  prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "VerificationLog", "VerificationItem", "CuttingOrder" RESTART IDENTITY CASCADE`,
  );