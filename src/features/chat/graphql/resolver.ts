import {
  Arg,
  Ctx,
  Int,
  Mutation,
  Publisher,
  PubSub,
  Query,
  Resolver,
  ResolverFilterData,
  Root,
  Subscription,
  UseMiddleware
} from "type-graphql";
import Context from "../../../shared/context";
import {
  Conversation,
  Media,
  Message,
  MessageSub,
  SendMessageInput,
  Typing
} from "./types";
import isAuthenticated from "../../auth/graphql/is-authenticated";
import {ApolloError, UserInputError} from "apollo-server-express";

@Resolver()
export default class ChatResolver {

  @Mutation(() => Conversation)
  @UseMiddleware(isAuthenticated)
  getOrCreateOneToOneConversation(
    @Ctx() context: Context,
    @Arg("userID") userID: string,
  ) {
    return context.toolBox.dataSources.chatDS.findOrCreateOneToOneConversation(
      context.userID!, userID
    );
  }

  @Query(() => [Conversation])
  @UseMiddleware(isAuthenticated)
  getConversations(@Ctx() context: Context) {
    return context.toolBox.dataSources.chatDS.getConversations(context.userID!);
  }

  @Query(() => [Message])
  @UseMiddleware(isAuthenticated)
  async getMoreMessages(
    @Ctx() context: Context,
    @Arg('conversationID', () => Int) conversationID: number,
    @Arg('messageID', () => Int) messageID: number
  ): Promise<Message[]> {
    const chatDS = context.toolBox.dataSources.chatDS;
    const canGet = await chatDS.getMinimalConversation(conversationID, context.userID!);
    if (!canGet) throw new ApolloError("Not a member of this conversation");
    return chatDS.getMoreMessages(conversationID, messageID);
  }

  @Mutation(() => Typing)
  @UseMiddleware(isAuthenticated)
  async typing(
    @Ctx() context: Context,
    @PubSub("TYPINGS") publish: Publisher<TypingSubscriptionPayload>,
    @Arg("conversationID") conversationID: number
  ): Promise<Typing> {
    const chatDS = context.toolBox.dataSources.chatDS;
    const userID = context.userID!;
    const canType = await chatDS.getMinimalConversation(conversationID, userID);
    if (!canType) throw new ApolloError("Not a member of this conversation");
    const typing = await chatDS.typing(conversationID, userID);
    const receivers = canType.participantsIDs.filter(id => id != userID);
    publish({typing, receivers});
    return typing;
  }

  @Mutation(() => Message)
  @UseMiddleware(isAuthenticated)
  async sendMessage(
    @Ctx() context: Context,
    @Arg('message') input: SendMessageInput,
    @PubSub('MESSAGES') publish: Publisher<MessageSubscriptionPayload>
  ) {
    if (!input.text && (!input.medias || !input.medias.length)) {
      throw new UserInputError(
        'You must provide at least on of "text" or "media"'
      );
    }
    let hasMedia = false;
    if (input.medias && input.medias.length) {
      if (input.medias.length > 10) {
        throw new UserInputError("You can't send more than 10 files at once");
      }
      hasMedia = true;
    }
    const senderID = context.userID!;
    const chatDS = context.toolBox.dataSources.chatDS;
    const canBeSent = await chatDS.getMinimalConversation(input.conversationID, senderID);
    if (!canBeSent) {
      throw new ApolloError(
        "You can't send a message in the conversation",
        "MESSAGE_CANNOT_BE_SENT"
      );
    }
    let medias: Media[] | undefined;
    if (hasMedia) {
      const promises = input.medias!.map(file =>
        context.toolBox.utils.file
          .saveConversationMedia(file, input.conversationID)
      );
      medias = await Promise.all(promises);
    }
    const sentMessage = await chatDS.sendMessage({
      conversationID: input.conversationID,
      senderID: context.userID!,
      text: input.text,
      medias
    });
    publish({message: sentMessage, receivers: canBeSent.participantsIDs});
    return sentMessage;
  }

  @Mutation(() => Int)
  @UseMiddleware(isAuthenticated)
  async messagesDelivered(
    @Ctx() context: Context,
    @PubSub('MESSAGES') publish: Publisher<MessageSubscriptionPayload>,
    @Arg('conversationIDs', () => [Int]) conversationIDs: number[]
  ): Promise<number> {
    const result = await context.toolBox.dataSources.chatDS.messagesDelivered(
      conversationIDs, context.userID!
    );
    result.map(message => publish({message, update: true}));
    return result.length;
  }

  @Mutation(() => Int)
  @UseMiddleware(isAuthenticated)
  async messagesSeen(
    @Ctx() context: Context,
    @PubSub('MESSAGES') publish: Publisher<MessageSubscriptionPayload>,
    @Arg('conversationID', () => Int) conversationID: number
  ): Promise<number> {
    const result = await context.toolBox.dataSources.chatDS.messagesSeen(
      conversationID, context.userID!
    );
    result.map(message => publish({message, update: true}));
    return result.length;
  }

  @Subscription(() => MessageSub, {
    topics: 'MESSAGES',
    filter: ChatResolver.messagesFilter
  })
  messages(@Root() {message, update}: MessageSubscriptionPayload): MessageSub {
    return {message, update};
  }

  @Subscription(() => MessageSub, {
    topics: 'TYPINGS',
    filter: ChatResolver.typingsFilter
  })
  typings(@Root() {typing}: TypingSubscriptionPayload): Typing {
    return typing;
  }

  static messagesFilter(
    data: ResolverFilterData<MessageSubscriptionPayload, any, Context>
  ): boolean {
    const {context, payload} = data;
    const userID = context.connection?.context.userID;
    if (payload.update) return payload.message.senderID == userID;
    return (payload.message.senderID != userID
      && !!payload.receivers
      && payload.receivers.indexOf(userID) != -1);
  }

  static typingsFilter(
    data: ResolverFilterData<TypingSubscriptionPayload, any, Context>
  ): boolean {
    const {context, payload} = data;
    const userID = context.connection?.context.userID;
    return payload.receivers.indexOf(userID) != -1;
  }
}

export type MessageSubscriptionPayload = {
  message: Message,
  receivers?: string[],
  update?: boolean,
}

export type TypingSubscriptionPayload = {
  typing: Typing,
  receivers: string[],
}