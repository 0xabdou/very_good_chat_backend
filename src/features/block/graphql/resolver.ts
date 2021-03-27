import {Arg, Ctx, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import {Block} from "./types";
import Context from "../../../shared/context";
import isAuthenticated from "../../auth/graphql/is-authenticated";

@Resolver()
export default class BlockResolver {
  @Mutation(() => Block)
  @UseMiddleware(isAuthenticated)
  async block(@Ctx() context: Context, @Arg('blocked_id') blockedID: string): Promise<Block> {
    const blockingID = context.userID!;
    // This unfriends the two users if they are already friends
    // Or removes any pending friend requests between them
    await context.toolBox.dataSources.friendDS.unfriend(blockingID, blockedID);
    // this actually blocks the user
    return context.toolBox.dataSources.blockDS.block(blockingID, blockedID);
  }

  @Mutation(() => String)
  @UseMiddleware(isAuthenticated)
  unblock(@Ctx() context: Context, @Arg('blocked_id') blockedID: string): Promise<string> {
    return context.toolBox.dataSources.blockDS.unblock(context.userID!, blockedID);
  }

  @Query(() => [Block])
  @UseMiddleware(isAuthenticated)
  getBlockedUsers(@Ctx() context: Context) {
    return context.toolBox.dataSources.blockDS.getBlockedUsers(context.userID!);
  }
}