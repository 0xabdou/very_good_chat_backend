import {inject, injectable} from "inversify";
import {PrismaClient} from "@prisma/client";
import TYPES from "../../../service-locator/types";
import {Block} from "../graphql/types";
import UserDataSource from "../../user/data/user-data-source";

@injectable()
export default class BlockDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async block(blockingID: string, blockedID: string): Promise<Block> {
    const block = await this._prisma.block.create({
      data: {blockingID, blockedID},
      include: {
        blocked: {
          include: {user: true}
        }
      }
    });
    return {
      user: UserDataSource._getGraphQLUser(block.blocked.user!),
      date: block.date
    };
  }

  async unblock(blockingID: string, blockedID: string): Promise<string> {
    await this._prisma.block.delete({
      where: {blockingID_blockedID: {blockedID, blockingID}}
    });
    return blockedID;
  }

  async getBlockedUsers(blockingID: string): Promise<Block[]> {
    const blocks = await this._prisma.block.findMany({
      where: {blockingID},
      include: {blocked: {include: {user: true}}},
      orderBy: {date: 'desc'},
    });
    return blocks.map(block => {
      return {
        user: UserDataSource._getGraphQLUser(block.blocked.user!),
        date: block.date
      };
    });
  }

  async getBlockingUserIDs(blockedID: string): Promise<string[]> {
    const blocks = await this._prisma.block.findMany({
      where: {blockedID},
      orderBy: {date: 'desc'},
    });
    return blocks.map(block => block.blockingID);
  }

  async getBlockStatus(user1ID: string, user2ID: string)
    : Promise<'blocking' | 'blocked' | undefined> {
    const blocks = await this._prisma.block.findMany({
      where: {
        OR: [
          {blockingID: user1ID, blockedID: user2ID},
          {blockingID: user2ID, blockedID: user1ID}
        ]
      }
    });
    if (blocks.length) {
      if (blocks[0].blockingID == user1ID) return 'blocking';
      return 'blocked';
    }
  }
}