import {Arg, Args, Ctx, Mutation, Query, Resolver} from "type-graphql";
import {
  returnsFriendship,
  returnsFriendshipInfo
} from "../../../shared/graphql/return-types";
import {Friendship, FriendshipInfo} from "./types";
import Context from "../../../shared/context";
import {GerUserArgs} from "../../user/graphql/types";
import {ApolloError} from "apollo-server-express";

@Resolver()
export default class FriendResolver {

  @Query(returnsFriendshipInfo)
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
  sendFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.sendFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  acceptFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.acceptFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  declineFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  )
    : Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.declineFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  cancelFriendRequest(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.cancelFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  unfriend(
    @Ctx() context: Context,
    @Arg('userID') userID: string
  ): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.unfriend(
      context.userID!, userID
    );
  }
}