import {Field, ObjectType, registerEnumType} from "type-graphql";
import {User} from "../../user/graphql/types";

@ObjectType()
export class Conversation {
  @Field()
  id!: number;

  @Field(() => ConversationType)
  type!: ConversationType;

  @Field(() => [User])
  participants!: User[];

  @Field(() => [Message])
  messages!: Message[];
}

export enum ConversationType {
  ONE_TO_ONE = 'ONE_TO_ONE',
  GROUP = 'GROUP'
}

registerEnumType(ConversationType, {name: 'ConversationType'});

@ObjectType()
export class Message {
  @Field()
  id!: number;

  @Field()
  senderID!: string;

  @Field({nullable: true})
  text?: string;

  @Field(() => [Media], {nullable: true})
  medias!: Media[];

  @Field()
  sentAt!: Date;
}

@ObjectType()
export class Media {
  @Field(() => MediaType)
  type!: MediaType;

  @Field()
  url!: string;
}

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO"
}

registerEnumType(MediaType, {name: 'MediaType'});