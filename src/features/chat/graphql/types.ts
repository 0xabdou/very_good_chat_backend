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

  @Field()
  canChat!: boolean;
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

  @Field(() => [Delivery])
  deliveredTo!: Delivery[];

  @Field(() => [Delivery])
  seenBy!: Delivery[];
}

@ObjectType()
export class Delivery {
  @Field()
  userID!: string;
  @Field()
  date!: Date;
}

@ObjectType()
export class Media {
  @Field(() => MediaType)
  type!: MediaType;

  @Field()
  url!: string;

  @Field({nullable: true})
  thumbUrl?: string;
}

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
}

registerEnumType(MediaType, {name: 'MediaType'});

@ObjectType()
export class MessageSub {
  @Field(() => Message)
  message!: Message;
  @Field({nullable: true})
  update?: boolean;
}

@InputType()
export class SendMessageInput {
  @Field(() => Int)
  conversationID!: number;

  @Field({nullable: true})
  text?: string;

  @Field(() => [GraphQLUpload], {nullable: true})
  medias?: Promise<FileUpload>[];
}

@InputType()
export class TypingInput {
  @Field(() => Int)
  conversationID!: number;

  @Field()
  started!: boolean;
}

@ObjectType()
export class Typing {
  @Field()
  conversationID!: number;

  @Field()
  userID!: string;

  @Field()
  started!: boolean;
}