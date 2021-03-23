import {Ctx, Mutation, Query, Resolver} from "type-graphql";
import {
  returnsBadge,
  returnsListOfBadges
} from "../../../shared/graphql/return-types";
import {Badge, BadgeName} from "./types";
import Context from "../../../shared/context";

@Resolver()
export default class BadgeResolver {
  @Query(returnsListOfBadges)
  getBadges(@Ctx() context: Context) : Promise<Badge[]>{
    return context.toolBox.dataSources.badgeDS.getUserBadges(context.userID!);
  }

  @Mutation(returnsBadge)
  updateBadge(@Ctx() context: Context, badgeName: BadgeName) {
    return context.toolBox.dataSources.badgeDS
      .updateBadge(context.userID!, badgeName);
  }
}