import {LoginResponse} from "../../features/auth/graphql/types";
import {User} from "../../features/user/graphql/types";
import {GraphQLUpload} from "graphql-upload";
import {
  FriendRequests,
  Friendship,
  FriendshipInfo,
  FriendshipStatus
} from "../../features/friend/graphql/types";
import {Badge} from "../../features/badge/graphql/types";

export const returnsString = () => String;
export const returnsBoolean = () => Boolean;
export const returnsLoginResponse = () => LoginResponse;
export const returnsUser = () => User;
export const returnsListOfUsers = () => [User];
export const returnsFriendshipInfo = () => FriendshipInfo;
export const returnsFriendship = () => Friendship;
export const returnsFriendRequests = () => FriendRequests;
export const returnsBadge = () => Badge;
export const returnsListOfBadges= () => [Badge];

export const ofTypeGraphQLUpload = () => GraphQLUpload;
export const ofTypeFriendshipStatus = () => FriendshipStatus;
