import {inject, injectable} from "inversify";
import {PrismaClient} from '@prisma/client';
import TYPES from "../../../service-locator/types";
import {Notification, NotificationType} from "../graphql/types";
import UserDataSource from "../../user/data/user-data-source";

@injectable()
export default class NotificationDataSource {
  private readonly _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async getNotifications(userID: string): Promise<Notification[]> {
    const notifications = await this._prisma.notification.findMany({
      where: {ownerID: userID},
      include: {friend: {include: {user: true}}},
      orderBy: {date: 'desc'}
    });
    return notifications.map(n => {
      return {
        id: n.id,
        date: n.date,
        seen: n.seen,
        type: NotificationType[n.type],
        friend: n.friend?.user ? UserDataSource._getGraphQLUser(n.friend.user) : undefined,
      };
    });
  }

  async markNotificationAsSeen(userID: string, notificationID: number): Promise<boolean> {
    await this._prisma.notification.update({
      where: {
        id_ownerID: {id: notificationID, ownerID: userID}
      },
      data: {seen: true}
    });
    return true;
  }

  async sendRequestAcceptedNotification(senderID: string, receiverID: string): Promise<void> {
    await this._prisma.notification.create({
      data: {
        date: new Date(),
        type: NotificationType.REQUEST_ACCEPTED,
        ownerID: receiverID,
        friendID: senderID,
      }
    });
  }
}