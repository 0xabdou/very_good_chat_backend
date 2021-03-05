import {PrismaClient} from "@prisma/client";

export default class AuthDataSource {
  private _prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async findAuthUserById(id: string) {
    return this._prisma.authUser.findUnique({where: {id}});
  }

  async findOrCreateAuthUser(email: string) {
    const authUser = await this._prisma.authUser.findUnique({where: {email}});
    if (authUser) return authUser;

    return await this._prisma.authUser.create({data: {email}});
  }
}