import {PrismaClient} from '@prisma/client';
import mockAuthUsers from "./seed-data/mock-auth-users";
import mockUsers from "./seed-data/mock-users";

const prisma = new PrismaClient();

const main = async () => {
  const ops = [];
  for (let i in mockAuthUsers) {
    ops.push(
      prisma.authUser.create({
        data: {
          ...mockAuthUsers[i],
          user: {
            create: mockUsers[i],
          }
        },
      })
    );
  }
  await prisma.$transaction(ops);
};

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });