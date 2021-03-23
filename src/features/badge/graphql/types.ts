import {Field, ObjectType, registerEnumType} from "type-graphql";

export enum BadgeName {
  NOTIFICATIONS = "NOTIFICATIONS",
  FRIEND_REQUESTS = "FRIEND_REQUESTS"
}

registerEnumType(BadgeName, {name: 'BadgeName'});

@ObjectType()
export class Badge {
  @Field(() => BadgeName)
  badgeName!: BadgeName;
  @Field()
  lastOpened!: Date;
}