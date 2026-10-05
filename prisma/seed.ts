import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const users = [
  {
    email: "supervisor@apparelflow.demo",
    password: "Supervisor@123",
    role: UserRole.CUTTING_SUPERVISOR,
    fullName: "Nimali Perera (Cutting Supervisor)",
  },
  {
    email: "verifier@apparelflow.demo",
    password: "Verifier@123",
    role: UserRole.CUTTING_VERIFIER,
    fullName: "Kasun Silva (Cutting Verifier)",
  },
  {
    email: "sewing@apparelflow.demo",
    password: "Sewing@123",
    role: UserRole.SEWING_SUPERVISOR,
    fullName: "Dilani Fernando (Sewing Supervisor)",
  },
];

async function main() {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    await prisma.user.upsert({
      where: {
        email: u.email,
      },
      update: {
        passwordHash,
        role: u.role,
        fullName: u.fullName,
      },
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        fullName: u.fullName,
      },
    });

    console.log(`Seeded user: ${u.email}`);
  }

  console.log("Seed data has been inserted successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
