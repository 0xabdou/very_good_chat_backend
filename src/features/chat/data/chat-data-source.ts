import {
  Conversation,
  ConversationType,
  Media,
  MediaType,
  Message
} from "../graphql/types";
import {
  AuthUser as PrismaAuthUser,
  Conversation as PrismaConversation,
  ConversationType as PrismaConversationType,
  Media as PrismaMedia,
  Message as PrismaMessage,
  PrismaClient,
  User as PrismaUser
} from "@prisma/client";
import {inject} from "inversify";
import TYPES from "../../../service-locator/types";
import UserDataSource from "../../user/data/user-data-source";

export default class ChatDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async findOrCreateOneToOneConversation(user1ID: string, user2ID: string): Promise<Conversation> {
    const existingConversations = await this._prisma.conversation.findMany({
      where: {
        participants: {every: {OR: [{id: user1ID}, {id: user2ID}]}},
        type: PrismaConversationType.ONE_TO_ONE
      },
      include: {
        participants: {include: {user: true}},
        messages: {orderBy: {sentAt: 'desc'}, include: {medias: true}}
      }
    });
    if (existingConversations[0]) {
      return ChatDataSource._getConversation(existingConversations[0]);
    }
    const conversation = await this._prisma.conversation.create({
      data: {
        type: ConversationType.ONE_TO_ONE,
        participants: {connect: [{id: user1ID}, {id: user2ID}]},
        createdAt: new Date()
      },
      include: {
        participants: {include: {user: true}},
        messages: {orderBy: {sentAt: 'desc'}, include: {medias: true}}
      }
    });
    return ChatDataSource._getConversation(conversation);
  }

  async getConversations(userID: string): Promise<Conversation[]> {
    const conversations = await this._prisma.conversation.findMany({
      where: {participants: {every: {id: userID}}},
      include: {
        participants: {include: {user: true}},
        messages: {orderBy: {sentAt: 'desc'}, include: {medias: true}}
      },
      orderBy: {updatedAt: 'desc'}
    });
    return conversations.map(ChatDataSource._getConversation);
  }

  async sendMessage(args: SendMessageArgs): Promise<Message> {
    const message = await this._prisma.message.create({
      data: {
        conversationID: args.conversationID,
        senderID: args.senderID,
        text: args.text ?? null,
        sentAt: new Date(),
        medias: args.medias ? {
          create: args.medias,
        } : undefined
      },
      include: {medias: true}
    });
    return ChatDataSource._getMessage(message);
  }

  async canSendMessage(conversationID: number, senderID: string): Promise<boolean> {
    const conversations = await this._prisma.conversation.findMany({
      where: {id: conversationID, participants: {some: {id: senderID}}}
    });
    return conversations.length > 0;
  }

  static _getConversation(conversation: FullPrismaConversation): Conversation {
    return {
      id: conversation.id,
      type: ConversationType[conversation.type],
      participants: conversation.participants.map(p => UserDataSource._getGraphQLUser(p.user!)),
      messages: conversation.messages.map(ChatDataSource._getMessage)
    };
  }

  static _getMessage(message: FullPrismaMessage): Message {
    return {
      id: message.id,
      senderID: message.senderID,
      text: message.text ?? undefined,
      medias: message.medias.map(ChatDataSource._getMedia),
      sentAt: message.sentAt
    };
  }

  static _getMedia(media: PrismaMedia): Media {
    return {
      type: MediaType[media.type],
      url: media.url
    };
  }
}

export type SendMessageArgs = {
  conversationID: number,
  senderID: string,
  text?: string,
  medias?: Media[]
};

export type FullPrismaConversation = PrismaConversation & {
  participants: (PrismaAuthUser & {
    user: PrismaUser | null
  })[],
  messages: FullPrismaMessage[]
}

export type FullPrismaMessage = PrismaMessage & {
  medias: PrismaMedia[]
}
