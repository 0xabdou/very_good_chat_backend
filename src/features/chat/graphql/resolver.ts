import {Arg, Ctx, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import Context from "../../../shared/context";
import {
  Conversation,
  Media,
  MediaType,
  Message,
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
  async sendMessage(@Ctx() context: Context, @Arg('message') message: SendMessageInput) {
    if (!message.text && (!message.medias || !message.medias.length)) {
      throw new UserInputError(
        'You must provide at least on of "text" or "media"'
      );
    }
    let hasMedia = false;
    if (message.medias && message.medias.length) {
      if (message.medias.length > 10) {
        throw new UserInputError("You can't send more than 10 files at once");
      }
      hasMedia = true;
    }
    const senderID = context.userID!;
    const chatDS = context.toolBox.dataSources.chatDS;
    const canBeSent = await chatDS.canSendMessage(message.conversationID, senderID);
    if (!canBeSent) {
      throw new ApolloError(
        "You can't send a message in the conversation",
        "MESSAGE_CANNOT_BE_SENT"
      );
    }
    let medias: Media[] | undefined;
    if (hasMedia) {
      const tempURLs = await Promise.all(message.medias!.map(
        media => context.toolBox.utils.file.saveTempFile(media)
      ));
      const types = tempURLs.map(url => ChatResolver._getMediaType(url));
      const uploadedURLs = await Promise.all(tempURLs.map(
        url => context.toolBox.dataSources.uploader.uploadConversationMedia({
          mediaPath: url,
          conversationID: message.conversationID
        })
      ));
      medias = [];
      for (let i in uploadedURLs) {
        medias.push({
          url: uploadedURLs[i],
          type: types[i]
        });
      }
    }
    // TODO: notify subscriptions
    return chatDS.sendMessage({
      conversationID: message.conversationID,
      senderID: context.userID!,
      text: message.text,
      medias
    });
  }

  static _getMediaType(url: string): MediaType {
    const imageExt = ['png', 'jpg', 'jpeg'];
    const ext = url.split('.')[-1];
    if (imageExt.indexOf(ext) != -1) return MediaType.IMAGE;
    if (ext == 'mp4') return MediaType.VIDEO;
    throw new UserInputError('UNSUPPORTED_MEDIA_TYPE',);
  }
}