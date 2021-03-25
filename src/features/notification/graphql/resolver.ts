import {
  Arg,
  Ctx,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware
} from "type-graphql";
import isAuthenticated from "../../auth/graphql/is-authenticated";
import Context from "../../../shared/context";
import {Notification} from "./types";

@Resolver()
export default class NotificationResolver {
  @Query(() => [Notification])
  @UseMiddleware(isAuthenticated)
  getNotifications(@Ctx() context: Context) {
    return context.toolBox.dataSources.notificationDS.getNotifications(context.userID!);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  markNotificationAsSeen(
    @Ctx() context: Context,
    @Arg("notificationID", () => Int) notificationID: number
  ): Promise<Boolean> {
    return context.toolBox.dataSources.notificationDS.markNotificationAsSeen(
      context.userID!, notificationID
    );
  }
}