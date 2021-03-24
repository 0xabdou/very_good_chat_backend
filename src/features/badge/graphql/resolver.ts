import {Arg, Ctx, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import {
  returnsBadge,
  returnsListOfBadges
} from "../../../shared/graphql/return-types";
import {Badge, BadgeName} from "./types";
import Context from "../../../shared/context";
import isAuthenticated from "../../auth/graphql/is-authenticated";

@Resolver()
export default class BadgeResolver {
  @Query(returnsListOfBadges)
  @UseMiddleware(isAuthenticated)
  getBadges(@Ctx() context: Context): Promise<Badge[]> {
    return context.toolBox.dataSources.badgeDS.getUserBadges(context.userID!);
  }

  @Mutation(returnsBadge)
  @UseMiddleware(isAuthenticated)
  updateBadge(@Ctx() context: Context, @Arg('badgeName', () => BadgeName) badgeName: BadgeName) {
    return context.toolBox.dataSources.badgeDS
      .updateBadge(context.userID!, badgeName);
  }
}