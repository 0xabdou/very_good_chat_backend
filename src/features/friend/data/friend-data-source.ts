import {PrismaClient} from '@prisma/client';
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";
import {Friendship, FriendshipStatus} from "../graphql/types";

@injectable()
export default class FriendDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async getFriendship(
    currentUserID: string, otherUserID: string
  ): Promise<Friendship> {
    // TODO: check if user is blocked/blocking before everything
    const results = await this._prisma.friend.findMany({
      where: {
        OR: [
          {user1ID: currentUserID, user2ID: otherUserID},
          {user1ID: otherUserID, user2ID: currentUserID},
        ]
      }
    });
    if (!results.length)
      return {status: FriendshipStatus.STRANGERS};
    const friend = results[0];
    if (friend.confirmed)
      return {status: FriendshipStatus.FRIENDS, date: friend.date};
    if (friend.user1ID == currentUserID)
      return {status: FriendshipStatus.REQUEST_SENT, date: friend.date};
    return {status: FriendshipStatus.REQUEST_RECEIVED, date: friend.date};
  }

  async sendFriendRequest(
    currentUserID: string, otherUserID: string
  ) : Promise<Friendship> {
    // TODO: should check if user is blocked/blocking and throw an error
    const friend = await this._prisma.friend.create({
      data: {
        user1ID: currentUserID,
        user2ID: otherUserID
      }
    });
    return {
      status: FriendshipStatus.REQUEST_SENT,
      date: friend.date,
    };
  }

  async acceptFriendRequest(
    currentUserID: string, otherUserID: string
  ) : Promise<Friendship> {
    const friend = await this._prisma.friend.update({
      where: {
        user1ID_user2ID: {
          user1ID:  otherUserID,
          user2ID: currentUserID,
        }
      },
      data: {confirmed: true}
    });
    return {
      status: FriendshipStatus.FRIENDS,
      date: friend.date
    };
  }

  async declineFriendRequest(
    currentUserID: string, otherUserID: string
  ) : Promise<Friendship> {
      await this._prisma.friend.delete({
        where: {
          user1ID_user2ID: {
            user1ID:  otherUserID,
            user2ID: currentUserID,
          }
        },
      });
      return {status: FriendshipStatus.STRANGERS};
  }

  async cancelFriendRequest(
    currentUserID: string, otherUserID: string
  ) : Promise<Friendship> {
    await this._prisma.friend.delete({
      where: {
        user1ID_user2ID: {
          user1ID:  currentUserID,
          user2ID: otherUserID,
        }
      },
    });
    return {status: FriendshipStatus.STRANGERS};
  }

  async unfriend(
    currentUserID: string, otherUserID: string
  ) : Promise<Friendship> {
    await this._prisma.friend.deleteMany({
      where: {
        OR: [
          {user1ID: currentUserID, user2ID: otherUserID},
          {user1ID: otherUserID, user2ID: currentUserID},
        ]
      }
    });
    return {status: FriendshipStatus.STRANGERS};
  }
}