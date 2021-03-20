import {PrismaClient} from '@prisma/client';
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";
import {Friendship, FriendshipStatus} from "../graphql/types";
import {ApolloError} from "apollo-server-express";

export const friendErrors = {
  REQUEST_RECEIVED: 'REQUEST_RECEIVED',
  REQUEST_REMOVED: 'REQUEST_REMOVED',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
};

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
  ): Promise<Friendship> {
    // TODO: should check if user is blocked/blocking and throw an error
    const existingFriend = await this._prisma.friend.findUnique({
      where: {
        user1ID_user2ID: {
          user1ID: otherUserID,
          user2ID: currentUserID
        }
      }
    });
    if (existingFriend) {
      if (existingFriend.confirmed) {
        throw new ApolloError(
          "Users are already friends",
          friendErrors.ALREADY_FRIENDS,
        );
      }
      throw new ApolloError(
        "Request already received",
        friendErrors.REQUEST_RECEIVED,
      );
    }
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
  ): Promise<Friendship> {
    try {
      const friend = await this._prisma.friend.update({
        where: {
          user1ID_user2ID: {
            user1ID: otherUserID,
            user2ID: currentUserID,
          }
        },
        data: {confirmed: true}
      });
      return {
        status: FriendshipStatus.FRIENDS,
        date: friend.date
      };
    } catch (e) {
      if (e.code == 'P2025') {
        throw new ApolloError(
          'Request canceled',
          friendErrors.REQUEST_REMOVED
        );
      }
      throw e;
    }
  }

  async declineFriendRequest(
    currentUserID: string, otherUserID: string
  ): Promise<Friendship> {
    try {
      await this._prisma.friend.delete({
        where: {
          user1ID_user2ID: {
            user1ID: otherUserID,
            user2ID: currentUserID,
          }
        },
      });
      return {status: FriendshipStatus.STRANGERS};
    } catch (e) {
      console.log(e);
      if (e.code == 'P2025') {
        throw new ApolloError(
          'The request was canceled/declined',
          friendErrors.REQUEST_REMOVED
        );
      }
      throw e;
    }
  }

  async cancelFriendRequest(
    currentUserID: string, otherUserID: string
  ): Promise<Friendship> {
    const existingFriend = await this._prisma.friend.findUnique({
      where: {
        user1ID_user2ID: {
          user1ID: currentUserID,
          user2ID: otherUserID,
        }
      }
    });
    if (existingFriend?.confirmed) {
      throw new ApolloError(
        "You're already friends",
        friendErrors.ALREADY_FRIENDS
      );
    }
    try {
      await this._prisma.friend.delete({
        where: {
          user1ID_user2ID: {
            user1ID: currentUserID,
            user2ID: otherUserID,
          }
        },
      });
      return {status: FriendshipStatus.STRANGERS};
    } catch (e) {
      console.log(e);
      if (e.code == 'P2025') {
        throw new ApolloError(
          'The request was already canceled',
          friendErrors.REQUEST_REMOVED
        );
      }
      throw e;
    }
  }

  async unfriend(
    currentUserID: string, otherUserID: string
  ): Promise<Friendship> {
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