import {Ctx, Query, Resolver, UseMiddleware} from "type-graphql";
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
}