// Prisma seed entrypoint — runs the shared seeding module.
import { seedDatabase } from "../src/lib/seed";

async function main() {
  const result = await seedDatabase();
  console.log("✓ BloodLink database seeded:");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    const { db } = await import("../src/lib/db");
    await db.$disconnect();
  });
