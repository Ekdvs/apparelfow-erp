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

const recipes = [
  {
    recipeCode: "REC-BL01", name: "Casual Blouse", category: "Blouse",
    stdFabricYards: 1.8, wastageCap: 5.0,
    components: [
      ["Front Body Panel", 1], ["Back Body Panel", 1],
      ["Sleeves (Left & Right)", 2], ["Collar & Stand", 1], ["Sleeve Cuffs", 2],
    ],
  },
  {
    recipeCode: "REC-CT02", name: "Crop Top", category: "Crop Top",
    stdFabricYards: 1.1, wastageCap: 8.0,
    components: [
      ["Front Chest Panel", 1], ["Back Support Panel", 1],
      ["Neck Binding Strip", 1], ["Hem Elastic Casing", 1], ["Side Strap Accents", 2],
    ],
  },
] as const;

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

  for (const r of recipes) {
  const recipe = await prisma.recipe.upsert({
    where: { recipeCode: r.recipeCode },
    update: { name: r.name, category: r.category, stdFabricYards: r.stdFabricYards, wastageCap: r.wastageCap },
    create: { recipeCode: r.recipeCode, name: r.name, category: r.category, stdFabricYards: r.stdFabricYards, wastageCap: r.wastageCap },
  });

  await prisma.recipeComponent.deleteMany({ where: { recipeId: recipe.id } });
  await prisma.recipeComponent.createMany({
    data: r.components.map(([componentName, piecesPerGarment]) => ({
      recipeId: recipe.id, componentName, piecesPerGarment,
    })),
  });
  console.log(`Seeded recipe: ${r.recipeCode}`);
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
