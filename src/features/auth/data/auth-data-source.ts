import {PrismaClient} from "@prisma/client";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";

@injectable()
export default class AuthDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async findOrCreateAuthUser(email: string) {
    const authUser = await this._prisma.authUser.findUnique({where: {email}});
    if (authUser) return authUser;

    return await this._prisma.authUser.create({data: {email}});
  }
}