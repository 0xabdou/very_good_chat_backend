import {
  AuthUser as PrismaAuthUser,
  Badge as PrismaBadge,
  Block as PrismaBlock,
  Conversation as PrismaConversation,
  ConversationType as PrismaConversationType,
  Friend as PrismaFriend,
  Media as PrismaMedia,
  MediaType as PrismaMediaType,
  User as PrismaUser,
} from '@prisma/client';
import {AuthProviderUser} from "../src/features/auth/data/google-api";
import UserDataSource, {CreateUserArgs} from "../src/features/user/data/user-data-source";
import {Me, User} from '../src/features/user/graphql/types';
import {
  Friendship,
  FriendshipStatus
} from "../src/features/friend/graphql/types";
import {ResizedPhotos} from "../src/shared/utils/file-utils";
import {BadgeName} from "../src/features/badge/graphql/types";
import {Block} from "../src/features/block/graphql/types";
import {
  FullPrismaConversation,
  FullPrismaMessage
} from "../src/features/chat/data/chat-data-source";
import {
  Conversation,
  ConversationType,
  Media,
  MediaType,
  Message
} from "../src/features/chat/graphql/types";

export const mockPrismaAuthUser: PrismaAuthUser = {
  id: 'auth_user_id',
  email: 'auth@email.com',
};


export const mockPrismaUser: PrismaUser = {
  username: 'username',
  name: null,
  photoURLSource: '/storage/auth_user_id_pp_source.png',
  photoURLMedium: '/storage/auth_user_id_pp_medium.png',
  photoURLSmall: '/storage/auth_user_id_pp_small.png',
  authUserID: 'auth_user_id',
  activeStatus: true,
  lastSeen: new Date(),
};

export const mockGraphQLUser: User = {
  id: mockPrismaUser.authUserID,
  username: mockPrismaUser.username,
  name: mockPrismaUser.name ?? undefined,
  photoURLSource: '/storage/auth_user_id_pp_source.png',
  photoURLMedium: '/storage/auth_user_id_pp_medium.png',
  photoURLSmall: '/storage/auth_user_id_pp_small.png',
};

export const mockMe: Me = {
  user: mockGraphQLUser,
  activeStatus: mockPrismaUser.activeStatus
};

export const mockResizedPhotos: ResizedPhotos = {
  source: 'source',
  medium: 'medium',
  small: 'small'
};

export const mockAuthProviderUser: AuthProviderUser = {
  email: 'provider@email.com',
  displayName: 'Provider User',
  photoURL: 'https://provider.com/photo.png',
};

export const mockCreateUserArgs: CreateUserArgs = {
  authUserID: 'authUserID',
  username: 'username',
  name: 'name',
};

export const mockFriend: PrismaFriend = {
  id: 0,
  user1ID: 'user1ID',
  user2ID: 'user2ID',
  confirmed: false,
  date: new Date()
};

export const mockFriendship: Friendship = {
  status: FriendshipStatus.FRIENDS,
  date: new Date()
};

export const mockPrismaBadges: PrismaBadge[] = [
  {
    userID: 'USERIDDDD',
    badgeName: BadgeName.FRIEND_REQUESTS,
    lastOpened: new Date()
  },
  {
    userID: 'USERIDDDD',
    badgeName: BadgeName.NOTIFICATIONS,
    lastOpened: new Date()
  },
];

type PrismaBlockWithUser = PrismaBlock & ({
  blocked: PrismaAuthUser & { user: PrismaUser }
});

export const mockPrismaBlock: PrismaBlockWithUser = {
  id: 1231,
  blockingID: 'blockingID',
  blockedID: 'blockedID',
  blocked: {
    ...mockPrismaAuthUser,
    user: mockPrismaUser
  },
  date: new Date(),
};

export const mockBlock: Block = {
  user: UserDataSource._getGraphQLUser(mockPrismaBlock.blocked.user),
  date: mockPrismaBlock.date
};

const conversationID = 321;
const messageId = 123;
export const mockPrismaConversation: PrismaConversation = {
  id: conversationID,
  type: PrismaConversationType.ONE_TO_ONE,
  updatedAt: new Date(),
  createdAt: new Date(),
};

export const mockPrismaMedia: PrismaMedia = {
  id: 191,
  messageID: messageId,
  type: PrismaMediaType.IMAGE,
  url: 'https://picsum.org/420x69',
};

export const mockPrismaMessage: FullPrismaMessage = {
  id: messageId,
  conversationID: mockPrismaConversation.id,
  senderID: mockPrismaAuthUser.id,
  text: 'hello world',
  sentAt: new Date(),
  medias: [mockPrismaMedia],
  deliveredTo: [mockPrismaAuthUser],
  seenBy: [mockPrismaAuthUser],
};


export const mockPrismaFullConversation: FullPrismaConversation = {
  ...mockPrismaConversation,
  participants: [
    {
      ...mockPrismaAuthUser,
      user: mockPrismaUser
    }
  ],
  messages: [
    {...mockPrismaMessage, medias: [mockPrismaMedia]}
  ]
};

export const mockMedia: Media = {
  type: MediaType[mockPrismaMedia.type],
  url: mockPrismaMedia.url
};

export const mockMessage: Message = {
  id: mockPrismaMessage.id,
  conversationID: mockPrismaMessage.conversationID,
  senderID: mockPrismaMessage.senderID,
  text: mockPrismaMessage.text ?? undefined,
  medias: [mockMedia],
  sentAt: mockPrismaMessage.sentAt,
  deliveredTo: mockPrismaMessage.deliveredTo.map(u => u.id),
  seenBy: mockPrismaMessage.seenBy.map(u => u.id),
};

export const mockConversation: Conversation = {
  id: mockPrismaFullConversation.id,
  type: ConversationType[mockPrismaFullConversation.type],
  participants: [mockGraphQLUser],
  messages: [mockMessage]
};

export const mockTheDate = (): [jest.SpyInstance, Date] => {
  const mocked = new Date();
  const spy = jest
    .spyOn(global, 'Date')
    .mockImplementation(() => mocked as unknown as string);
  return [spy, mocked];
};