import {Field, ObjectType, registerEnumType} from "type-graphql";
import {User} from "../../user/graphql/types";
import {ofTypeFriendshipStatus} from "../../../shared/graphql/return-types";

export enum FriendshipStatus {
  STRANGERS = 'STRANGERS',
  FRIENDS = 'FRIENDS',
  REQUEST_SENT = 'REQUEST_SENT',
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  BLOCKED = 'BLOCKED',
  BLOCKING = 'BLOCKING'
}

registerEnumType(FriendshipStatus, {name: 'FriendshipStatus'});

@ObjectType()
export class Friendship {
  @Field(ofTypeFriendshipStatus)
  status!: FriendshipStatus;
  @Field({nullable: true})
  date?: Date;
}

@ObjectType()
export class FriendshipInfo {
  @Field()
  user!: User;
  @Field()
  friendship!: Friendship;
}

@ObjectType()
export class FriendRequest {
  @Field()
  user!: User;
  @Field()
  date!: Date;
}

@ObjectType()
export class FriendRequests {
  @Field(() => [FriendRequest])
  sent!: FriendRequest[];
  @Field(() => [FriendRequest])
  received!: FriendRequest[];
}

@ObjectType()
export class Friend {
  @Field()
  user!: User;
  @Field()
  friendshipDate!: Date;
  @Field({nullable: true})
  lastSeen?: Date;
}
