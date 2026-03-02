import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find testuser1
  const user = await prisma.user.findFirst({
    where: { username: "testuser1" },
    select: { id: true, username: true, email: true, isActive: true },
  });

  if (!user) {
    console.log("testuser1 bulunamadı");
    return;
  }

  console.log("Bulunan kullanıcı:", user);

  if (!user.isActive) {
    console.log("Kullanıcı zaten deaktif");
    return;
  }

  // Soft delete (deactivate)
  await prisma.user.update({
    where: { id: user.id },
    data: { isActive: false },
  });

  console.log("testuser1 deaktif edildi");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
