import {Field, ObjectType, registerEnumType} from "type-graphql";

export enum BadgeName {
  NOTIFICATIONS = "NOTIFICATIONS",
  FRIEND_REQUESTS = "FRIEND_REQUESTS"
}

@ObjectType()
export class Badge {
  @Field()
  badgeName!: BadgeName;
  @Field()
  lastOpened!: Date;
}

registerEnumType(BadgeName, {name: 'BadgeName'});