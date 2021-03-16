import {Ctx, Mutation, Query, Resolver} from "type-graphql";
import {
  returnsFriendship,
  returnsFriendshipInfo
} from "../../../shared/graphql/return-types";
import {Friendship, FriendshipInfo} from "./types";
import Context from "../../../shared/context";
import {User} from "../../user/graphql/types";
import {ApolloError} from "apollo-server-express";

@Resolver()
export default class FriendResolver {

  @Query(returnsFriendshipInfo)
  async getFriendshipInfo(@Ctx() context: Context, userID: string)
    : Promise<FriendshipInfo> {
    const futures: [Promise<User | null>, Promise<Friendship>] = [
      context.toolBox.dataSources.userDS.getUser(userID),
      context.toolBox.dataSources.friendDS.getFriendship(
        context.userID!, userID
      )
    ];
    const presents = await Promise.all(futures);
    if (!presents[0]) throw new ApolloError('User not found', 'USER_NOT_FOUND');
    return {
      user: presents[0],
      friendship: presents[1],
    };
  }

  @Mutation(returnsFriendship)
  sendFriendRequest(@Ctx() context: Context, userID: string)
    : Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.sendFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  acceptFriendRequest(@Ctx() context: Context, userID: string)
    : Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.acceptFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  declineFriendRequest(@Ctx() context: Context, userID: string)
    : Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.declineFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  cancelFriendRequest(@Ctx() context: Context, userID: string)
    : Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.cancelFriendRequest(
      context.userID!, userID
    );
  }

  @Mutation(returnsFriendship)
  unfriend(@Ctx() context: Context, userID: string): Promise<Friendship> {
    return context.toolBox.dataSources.friendDS.unfriend(
      context.userID!, userID
    );
  }
}