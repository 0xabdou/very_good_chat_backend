import {Field, Int, ObjectType, registerEnumType} from "type-graphql";
import {User} from "../../user/graphql/types";

export enum NotificationType {
  REQUEST_ACCEPTED = 'REQUEST_ACCEPTED',
  SYSTEM = 'SYSTEM'
}

registerEnumType(NotificationType, {name: 'NotificationType'});

@ObjectType()
export class Notification {
  @Field(() => Int)
  id!: number;
  @Field()
  date!: Date;
  @Field()
  seen!: boolean;
  @Field(() => NotificationType)
  type!: NotificationType;
  // If type == REQUEST_ACCEPTED
  @Field(() => User, {nullable: true})
  friend?: User;
}