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

  async unblock(blockingID: string, blockedID: string): Promise<number> {
    const block = await this._prisma.block.delete({
      where: {
        blockingID_blockedID: {blockedID, blockingID}
      }
    });
    return block.id;
  }

  async getBlockedUsers(blockingID: string): Promise<Block[]> {
    const blocks = await this._prisma.block.findMany({
      where: {blockingID},
      include: {blocked: {include: {user: true}}}
    });
    return blocks.map(block => {
      return {
        user: UserDataSource._getGraphQLUser(block.blocked.user!),
        date: block.date
      };
    });
  }
}