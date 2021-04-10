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
  MediaType,
  Message,
  MessageSub,
  SendMessageInput
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
      const tempURLs = await Promise.all(input.medias!.map(
        media => context.toolBox.utils.file.saveTempFile(media)
      ));
      const types: MediaType[] = [];
      const urlsToUpload: Promise<string>[] = [];
      for (let url of tempURLs) {
        types.push(context.toolBox.utils.file.getMediaType(url));
        urlsToUpload.push(
          context.toolBox.dataSources.uploader.uploadConversationMedia({
            mediaPath: url,
            conversationID: input.conversationID
          })
        );
      }
      const uploadedURLs = await Promise.all(urlsToUpload);
      medias = [];
      for (let i in uploadedURLs) {
        medias.push({
          url: uploadedURLs[i],
          type: types[i]
        });
      }
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
    result.map(message => publish({message, update: true, receivers: []}));
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
    result.map(message => publish({message, update: true, receivers: []}));
    return result.length;
  }

  @Subscription(() => MessageSub, {
    topics: 'MESSAGES',
    filter: (data: ResolverFilterData<MessageSubscriptionPayload, any, Context>) => {
      const {context, payload} = data;
      const userID = context.connection?.context.userID;
      if (payload.update) return payload.message.senderID == userID;
      return payload.message.senderID != userID
        && payload.receivers.indexOf(userID) != -1;
    },
  })
  messages(@Root() {message, update}: MessageSubscriptionPayload): MessageSub {
    return {message, update};
  }
}

export type MessageSubscriptionPayload = {
  message: Message,
  receivers: string[],
  update?: boolean,
}