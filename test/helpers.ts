import container from "../src/service-locator/container";
import TYPES from "../src/service-locator/types";
import {PrismaClient} from '@prisma/client';

export const clearDatabase = async () => {
  const prisma = container.get<PrismaClient>(TYPES.PrismaClient);
  await Promise.all([
    prisma.authUser.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}