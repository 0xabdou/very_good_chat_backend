import {
  Arg,
  Args,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware
} from "type-graphql";
import {
  returnsFriendRequests,
  returnsFriendship,
  returnsFriendshipInfo
} from "../../../shared/graphql/return-types";
import {
  FriendRequests,
  Friendship,
  FriendshipInfo,
  FriendshipStatus
} from "./types";
import Context from "../../../shared/context";
import {GerUserArgs} from "../../user/graphql/types";
import {ApolloError} from "apollo-server-express";
import isAuthenticated from "../../auth/graphql/is-authenticated";

@Resolver()
export default class FriendResolver {

  @Query(returnsFriendRequests)
  @UseMiddleware(isAuthenticated)
  getFriendRequests(@Ctx() context: Context): Promise<FriendRequests> {
    return context.toolBox.dataSources.friendDS
      .getFriendRequests(context.userID!);
  }

  @Query(returnsFriendshipInfo)
  @UseMiddleware(isAuthenticated)
  async getFriendshipInfo(
    @Ctx() context: Context,
    @Args() args: GerUserArgs,
  ): Promise<FriendshipInfo> {
    const user = await context.toolBox.dataSources.userDS.getUser(args);
    if (!user) {
      throw new ApolloError('User not found', 'USER_NOT_FOUND');
    }
    const friendship = await context.toolBox.dataSources.friendDS.getFriendship(
      context.userID!, user.id
    );
    return {user, friendship};
  }

  @Mutation(returnsFriendship)
  @UseMiddleware(isAuthenticated)
  sendFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.sendFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  @UseMiddleware(isAuthenticated)
  async acceptFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    const friendship = await context.toolBox.dataSources.friendDS.acceptFriendRequest(
      context.userID!, userID
    );
    if (friendship.status === FriendshipStatus.FRIENDS) {
      context.toolBox.dataSources.notificationDS.sendRequestAcceptedNotification(
        context.userID!, userID
      );
    }
    return friendship;
  }

  @Mutation(returnsFriendship)
  @UseMiddleware(isAuthenticated)
  declineFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.declineFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  @UseMiddleware(isAuthenticated)
  cancelFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.cancelFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  @UseMiddleware(isAuthenticated)
  unfriend(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.unfriend(
      context.userID!, userID
    );
  }
}