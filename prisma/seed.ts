import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a user
  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(123456789) },
    update: {},
    create: {
      telegramId: BigInt(123456789),
      username: "danielazeiteiro",
      firstName: "Daniel",
      lastName: "Azeiteiro",
      languageCode: "pt",
    },
  });

  // Create a concert
  const concert = await prisma.concert.create({
    data: {
      artistName: "Arctic Monkeys",
      venue: "Altice Arena, Lisbon",
      concertDate: new Date("2025-12-01"),
      url: "https://example.com",
      userId: user.id,
      notes: "Tour 2025 kickoff show!",
    },
  });

  console.log("✅ Seed complete!");
  console.log({ user, concert });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
