import {PrismaClient, User as PrismaUser} from "@prisma/client";
import {GerUserArgs, User} from "../graphql/types";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";

@injectable()
export default class UserDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async getUser({id, username}: GerUserArgs): Promise<User | null> {
    let user: PrismaUser | null | undefined;
    if (id)
      user = await this._prisma.user.findUnique({where: {authUserID: id}});
    else if (username)
      user = await this._prisma.user.findUnique({where: {username}});
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

  async updateUser(args: UpdateUserArgs): Promise<User> {
    const user = await this._prisma.user.update({
      where: {authUserID: args.authUserID},
      data: {
        username: args.username,
        name: args.deleteName ? null : args.name,
        photoURL: args.deletePhoto ? null : args.photoURL,
      },
    });
    return UserDataSource._getGraphQLUser(user);
  }

  async findUsers(searchQuery: string): Promise<User[]> {
    const users = await this._prisma.user.findMany({
      where: {
        OR: [
          {
            username: {contains: searchQuery}
          },
          {
            name: {contains: searchQuery}
          }
        ]
      }
    });
    return users.map(u => UserDataSource._getGraphQLUser(u));
  }

  static _getGraphQLUser(user: PrismaUser): User {
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

export type UpdateUserArgs = {
  authUserID: string,
  username?: string,
  name?: string,
  deleteName?: boolean,
  photoURL?: string,
  deletePhoto?: boolean
}
