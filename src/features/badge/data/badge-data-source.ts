import {Badge, BadgeName} from "../graphql/types";
import {Badge as PrismaBadge, PrismaClient} from "@prisma/client";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";

@injectable()
export default class BadgeDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async getUserBadges(userID: string): Promise<Badge[]> {
    let badges = await this._prisma.badge.findMany({where: {userID}});
    if (!badges.length) badges = await Promise.all(this._createBadges(userID));
    return badges.map(BadgeDataSource._getBadge);
  }

  async updateBadge(userID: string, badgeName: BadgeName): Promise<Badge> {
    const badge = await this._prisma.badge.upsert({
      where: {userID_badgeName: {userID, badgeName}},
      update: {lastOpened: new Date()},
      create: {userID, badgeName, lastOpened: new Date()}
    });
    return {
      badgeName,
      lastOpened: badge.lastOpened
    };
  }

  private _createBadges(userID: string) {
    return Object.values(BadgeName).map(badgeName => {
      return this._prisma.badge.create({
        data: {userID, badgeName, lastOpened: new Date()}
      });
    });
  }

  static _getBadge(badge: PrismaBadge) {
    return {
      badgeName: BadgeName[badge.badgeName],
      lastOpened: badge.lastOpened
    };
  }
}