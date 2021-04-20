import {
  Conversation,
  ConversationType,
  Delivery,
  Media,
  MediaType,
  Message
} from "../graphql/types";
import {
  AuthUser as PrismaAuthUser,
  Conversation as PrismaConversation,
  ConversationType as PrismaConversationType,
  Delivery as PrismaDelivery,
  DeliveryType as PrismaDeliveryType,
  Media as PrismaMedia,
  Message as PrismaMessage,
  PrismaClient,
  User as PrismaUser
} from "@prisma/client";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";
import UserDataSource from "../../user/data/user-data-source";

export const MESSAGES_PER_FETCH = 30;

@injectable()
export default class ChatDataSource {
  private _prisma: PrismaClient;

  constructor(@inject(TYPES.PrismaClient) prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async findOrCreateOneToOneConversation(
    userID: string,
    otherUserID: string
  ): Promise<Conversation> {
    const existingConversations = await this._prisma.conversation.findMany({
      where: {
        participants: {every: {OR: [{id: userID}, {id: otherUserID}]}},
        type: PrismaConversationType.ONE_TO_ONE
      },
      include: {
        participants: {include: {user: true}},
        messages: {
          orderBy: {sentAt: 'desc'},
          include: {medias: true, deliveries: true},
          take: MESSAGES_PER_FETCH,
        }
      }
    });
    if (existingConversations[0]) {
      return ChatDataSource._getConversation(existingConversations[0], userID);
    }
    const conversation = await this._prisma.conversation.create({
      data: {
        type: ConversationType.ONE_TO_ONE,
        participants: {connect: [{id: userID}, {id: otherUserID}]},
        createdAt: new Date()
      },
      include: {
        participants: {include: {user: true}},
        messages: {
          orderBy: {sentAt: 'desc'},
          include: {medias: true, deliveries: true}
        }
      }
    });
    return ChatDataSource._getConversation(conversation, userID);
  }

  async getConversations(userID: string): Promise<Conversation[]> {
    const conversations = await this._prisma.conversation.findMany({
      where: {participants: {some: {id: userID}}},
      include: {
        participants: {include: {user: true}},
        messages: {
          orderBy: {sentAt: 'desc'},
          include: {medias: true, deliveries: true},
          take: MESSAGES_PER_FETCH,
        }
      },
      orderBy: {updatedAt: 'desc'}
    });
    return conversations
      .map(c => ChatDataSource._getConversation(c, userID))
      .sort((c1, c2) => {
        const lm1 = c1.messages[c1.messages.length - 1];
        const lm2 = c2.messages[c2.messages.length - 1];
        if (!lm1) return 1;
        if (!lm2) return -1;
        return lm2.sentAt.getTime() - lm1.sentAt.getTime();
      });
  }

  async getMoreMessages(conversationID: number, messageID: number) {
    const messages = await this._prisma.message.findMany({
      where: {conversationID},
      orderBy: {sentAt: 'desc'},
      cursor: {id: messageID},
      take: MESSAGES_PER_FETCH,
      include: {medias: true, deliveries: true}
    });
    return messages.reverse().map(ChatDataSource._getMessage);
  }

  async sendMessage(args: SendMessageArgs): Promise<Message> {
    const message = await this._prisma.message.create({
      data: {
        conversationID: args.conversationID,
        senderID: args.senderID,
        text: args.text ?? null,
        medias: args.medias ? {
          create: args.medias,
        } : undefined
      },
      include: {medias: true, deliveries: true}
    });
    return ChatDataSource._getMessage(message);
  }

  async getMinimalConversation(
    conversationID: number,
    senderID: string
  ): Promise<MinimalConversation | null> {
    const conversations = await this._prisma.conversation.findMany({
      where: {id: conversationID, participants: {some: {id: senderID}}},
      include: {participants: true}
    });
    if (conversations.length) {
      return {
        id: conversations[0].id,
        type: ConversationType[conversations[0].type],
        participantsIDs: conversations[0].participants.map(p => p.id)
      };
    }
    return null;
  }

  async messagesDelivered(conversationIDs: number[], userID: string): Promise<Message[]> {
    const result = await this._prisma.conversation.findMany({
      where: {
        id: {in: conversationIDs},
        participants: {some: {id: userID}}
      },
      include: {
        messages: {
          where: {
            senderID: {not: userID},
            deliveries: {
              none: {userID, type: PrismaDeliveryType.DELIVERED}
            }
          }
        }
      }
    });
    const messagesIDs: number[] = result.reduce((ids: number[], conv) => {
      return [
        ...ids,
        ...conv.messages.map(m => m.id)
      ];
    }, []);
    if (!messagesIDs.length) return [];
    const promises = messagesIDs.map(messageID => {
      return this._prisma.delivery.create({
        data: {userID, messageID, type: PrismaDeliveryType.DELIVERED},
        include: {message: {include: {deliveries: true, medias: true}}}
      });
    });
    const results: FullPrismaDelivery[] = await Promise.all(promises);
    return results.map(d => ChatDataSource._getMessage(d.message));
  }

  async messagesSeen(conversationID: number, userID: string): Promise<Message[]> {
    const result = await this._prisma.conversation.findMany({
      where: {
        id: conversationID,
        participants: {some: {id: userID}}
      },
      include: {
        messages: {
          where: {
            senderID: {not: userID},
            deliveries: {none: {userID, type: PrismaDeliveryType.SEEN}}
          },
        }
      }
    });
    const messagesIDs: number[] = result[0].messages.map(m => m.id);
    if (!messagesIDs.length) return [];
    const date = new Date();
    const promises = messagesIDs.map(messageID => {
      return this._prisma.delivery.create({
        data: {
          userID,
          messageID,
          type: PrismaDeliveryType.SEEN,
          date
        },
        include: {message: {include: {deliveries: true, medias: true}}}
      });
    });
    const results = await Promise.all(promises);
    return results.map(d => ChatDataSource._getMessage(d.message));
  }

  static _getConversation(
    conversation: FullPrismaConversation,
    currentUserID: string
  ): Conversation {
    return {
      id: conversation.id,
      type: ConversationType[conversation.type],
      participants: conversation.participants.filter(p => p.id != currentUserID)
        .map(p => UserDataSource._getGraphQLUser(p.user!)),
      messages: conversation.messages.map(ChatDataSource._getMessage).reverse(),
      canChat: true,
    };
  }

  static _getMessage(message: FullPrismaMessage): Message {
    const deliveredTo: Delivery[] = [];
    const seenBy: Delivery[] = [];
    message.deliveries.forEach(d => {
      const delivery: Delivery = {userID: d.userID, date: d.date};
      switch (d.type) {
        case PrismaDeliveryType.DELIVERED:
          deliveredTo.push(delivery);
          break;
        case PrismaDeliveryType.SEEN:
          seenBy.push(delivery);
      }
    });
    return {
      id: message.id,
      conversationID: message.conversationID,
      senderID: message.senderID,
      text: message.text ?? undefined,
      medias: message.medias.map(ChatDataSource._getMedia),
      sentAt: message.sentAt,
      deliveredTo,
      seenBy
    };
  }

  static _getMedia(media: PrismaMedia): Media {
    return {
      type: MediaType[media.type],
      url: media.url,
      thumbUrl: media.thumbUrl ?? undefined,
    };
  }
}

export type MinimalConversation = {
  id: number,
  type: ConversationType,
  participantsIDs: string[]
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
  deliveries: PrismaDelivery[],
}

export type FullPrismaDelivery = PrismaDelivery & {
  message: FullPrismaMessage
}
