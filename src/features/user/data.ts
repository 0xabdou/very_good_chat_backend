import {PrismaClient} from "@prisma/client";
import {User} from "./types";

type CreateUserArgs = {
  authUserID: string,
  username: string,
  name?: string,
  photoURL?: string,
}

export class UserStore {
  private _prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async getUser(id: string): Promise<User | null> {
    const user = await this._prisma.user.findUnique({
      where: {authUserID: id}
    });
    if (!user) return null;
    return {
      id: user.authUserID,
      username: user.username,
      name: user.name ?? undefined,
      photoURL: user.photoURL ?? undefined,
    };
  }

  async isUsernameTaken(username: string) {
    const user = await this._prisma.user.findUnique({
      where: {username},
    });
    return user != null;
  }

  async createUser(args: CreateUserArgs): Promise<User> {
    const user = await this._prisma.user.create({data: args,});
    return {
      id: user.authUserID,
      username: user.username,
      name: user.name ?? undefined,
      photoURL: user.photoURL ?? undefined,
    };
  }
}