import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType
} from "type-graphql";
import {User} from "../../user/graphql/types";
import {FileUpload, GraphQLUpload} from "graphql-upload";

@ObjectType()
export class Conversation {
  @Field(() => Int)
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
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  conversationID!: number;

  @Field()
  senderID!: string;

  @Field({nullable: true})
  text?: string;

  @Field(() => [Media], {nullable: true})
  medias!: Media[];

  @Field()
  sentAt!: Date;

  @Field(() => [String])
  deliveredTo!: string[];

  @Field(() => [String])
  seenBy!: string[];
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
  VIDEO = "VIDEO",
}

registerEnumType(MediaType, {name: 'MediaType'});

@InputType()
export class SendMessageInput {
  @Field(() => Int)
  conversationID!: number;

  @Field({nullable: true})
  text?: string;

  @Field(() => [GraphQLUpload], {nullable: true})
  medias?: Promise<FileUpload>[];
}