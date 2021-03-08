import {User as PrismaUser, PrismaClient} from "@prisma/client";
import {User} from "../graphql/types";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";

@injectable()
export default class UserDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async getUser(id: string): Promise<User | null> {
    const user = await this._prisma.user.findUnique({
      where: {authUserID: id}
    });
    if (!user) return null;
    return UserDataSource._getGraphQLUser(user);
  }

  async isUsernameTaken(username: string) {
    const user = await this._prisma.user.findUnique({
      where: {username},
    });
    return user != null;
  }

  async createUser(args: CreateUserArgs): Promise<User> {
    const user = await this._prisma.user.create({data: args});
    return UserDataSource._getGraphQLUser(user);
  }

  static _getGraphQLUser(user: PrismaUser) {
    return {
      id: user.authUserID,
      username: user.username,
      name: user.name ?? undefined,
      photoURL: user.photoURL ?? undefined,
    };
  }
}

export type CreateUserArgs = {
  authUserID: string,
  username: string,
  name?: string,
  photoURL?: string,
}
