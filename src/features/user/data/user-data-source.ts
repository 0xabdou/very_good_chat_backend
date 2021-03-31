import {PrismaClient, User as PrismaUser} from "@prisma/client";
import {GerUserArgs, Me, User} from "../graphql/types";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";
import {ResizedPhotos} from "../../../shared/utils/file-utils";

@injectable()
export default class UserDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async getMe(userID: string): Promise<Me | null> {
    const user = await this._prisma.user.findUnique({
      where: {authUserID: userID}
    });
    if (!user) return null;
    return {
      user: UserDataSource._getGraphQLUser(user),
      activeStatus: user.activeStatus
    };
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

  async createUser(args: CreateUserArgs): Promise<Me> {
    const user = await this._prisma.user.create({
      data: {
        username: args.username,
        authUserID: args.authUserID,
        name: args.name,
        photoURLSource: args.photo?.source,
        photoURLMedium: args.photo?.medium,
        photoURLSmall: args.photo?.small,
      }
    });
    return {
      user: UserDataSource._getGraphQLUser(user),
      activeStatus: user.activeStatus
    };
  }

  async updateUser(args: UpdateUserArgs): Promise<Me> {
    const user = await this._prisma.user.update({
      where: {authUserID: args.authUserID},
      data: {
        username: args.username,
        name: args.deleteName ? null : args.name,
        photoURLSource: args.deletePhoto ? null : args.photo?.source,
        photoURLMedium: args.deletePhoto ? null : args.photo?.medium,
        photoURLSmall: args.deletePhoto ? null : args.photo?.small,
      },
    });
    return {
      user: UserDataSource._getGraphQLUser(user),
      activeStatus: user.activeStatus
    };
  }

  async findUsers(searchQuery: string, excludeIDs: string[] = []): Promise<User[]> {
    const users = await this._prisma.user.findMany({
      where: {
        AND: [
          {authUserID: {notIn: excludeIDs}},
          {
            OR: [
              {
                username: {contains: searchQuery, mode: 'insensitive'},
              },
              {
                name: {contains: searchQuery, mode: 'insensitive'}
              }
            ],
          }
        ]
      },
    });
    return users.map(u => UserDataSource._getGraphQLUser(u));
  }

  async updateActiveStatus(userID: string, activeStatus: boolean): Promise<boolean> {
    await this._prisma.user.update({
      where: {authUserID: userID},
      data: {activeStatus}
    });
    return activeStatus;
  }

  async updateLastSeen(userID: string): Promise<Date> {
    const lastSeen = new Date();
    await this._prisma.user.update({
      where: {authUserID: userID},
      data: {lastSeen}
    });
    return lastSeen;
  }

  static _getGraphQLUser(user: PrismaUser): User {
    return {
      id: user.authUserID,
      username: user.username,
      name: user.name ?? undefined,
      photoURLSource: user.photoURLSource ?? undefined,
      photoURLMedium: user.photoURLMedium ?? undefined,
      photoURLSmall: user.photoURLSmall ?? undefined
    };
  }
}

export type CreateUserArgs = {
  authUserID: string,
  username: string,
  name?: string,
  photo?: ResizedPhotos,
}

export type UpdateUserArgs = {
  authUserID: string,
  username?: string,
  name?: string,
  deleteName?: boolean,
  photo?: ResizedPhotos,
  deletePhoto?: boolean
}
