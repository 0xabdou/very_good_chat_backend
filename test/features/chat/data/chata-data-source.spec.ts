import {
  ConversationType as PrismaConversationType,
  Prisma,
  PrismaClient
} from '@prisma/client';
import {
  anything,
  deepEqual,
  instance,
  mock,
  reset,
  verify,
  when
} from "ts-mockito";
import ChatDataSource, {
  FullPrismaConversation,
  SendMessageArgs
} from "../../../../src/features/chat/data/chat-data-source";
import {
  mockConversation,
  mockMedia,
  mockMessage,
  mockPrismaAuthUser,
  mockPrismaConversation,
  mockPrismaFullConversation,
  mockPrismaMedia,
  mockPrismaMessage,
  mockPrismaUser,
  mockTheDate
} from "../../../mock-objects";
import {
  Conversation,
  ConversationType
} from "../../../../src/features/chat/graphql/types";
import UserDataSource
  from "../../../../src/features/user/data/user-data-source";

const MockPrismaClient = mock<PrismaClient>();
const MockConversationDelegate = mock<Prisma.ConversationDelegate<any>>();
const MockMessageDelegate = mock<Prisma.MessageDelegate<any>>();
const user1ID = 'user1IDDD';
const user2ID = 'user2IDDD';
const [spy, mockDate] = mockTheDate();

const chatDS = new ChatDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.conversation).thenReturn(instance(MockConversationDelegate));
  when(MockPrismaClient.message).thenReturn(instance(MockMessageDelegate));
});

beforeEach(() => {
  reset(MockConversationDelegate);
  reset(MockMessageDelegate);
});

afterAll(() => {
  spy.mockRestore();
});

describe('parsers', () => {
  const userID = 'userIIIIIDDDDDDD';
  const inputConversation: FullPrismaConversation = {
    ...mockPrismaFullConversation,
    participants: [
      {
        ...mockPrismaAuthUser,
        id: '123',
        user: {...mockPrismaUser, authUserID: '123'}
      },
      {
        ...mockPrismaAuthUser,
        id: userID,
        user: {...mockPrismaUser, authUserID: userID}
      },
      {
        ...mockPrismaAuthUser,
        id: '321',
        user: {...mockPrismaUser, authUserID: '321'},
      },
    ]
  };
  const outputConversation: Conversation = {
    ...mockConversation,
    messages: [...mockConversation.messages].reverse(),
    participants: [
      UserDataSource._getGraphQLUser(inputConversation.participants[0].user!),
      UserDataSource._getGraphQLUser(inputConversation.participants[2].user!),
    ],
  };
  test('_getConversation', () => {
    // act
    const result = ChatDataSource._getConversation(inputConversation, userID);
    // assert
    expect(result).toStrictEqual(outputConversation);
  });
  test('_getMessage', () => {
    // act
    const result = ChatDataSource._getMessage(mockPrismaMessage);
    // assert
    expect(result).toStrictEqual(mockMessage);
  });
  test('_getMedia', () => {
    // act
    const result = ChatDataSource._getMedia(mockPrismaMedia);
    // assert
    expect(result).toStrictEqual(mockMedia);
  });
});

describe('createOneToOneConversation', function () {
  const verifyFindMany = () => {
    verify(MockConversationDelegate.findMany(deepEqual({
      where: {
        participants: {every: {OR: [{id: user1ID}, {id: user2ID}]}},
        type: PrismaConversationType.ONE_TO_ONE
      },
      include: {
        participants: {include: {user: true}},
        messages: {
          orderBy: {sentAt: 'desc'},
          include: {medias: true, seenBy: true, deliveredTo: true}
        }
      }
    }))).once();
  };

  test('should only return a conversation if it already exists', async () => {
    // arrange
    when(MockConversationDelegate.findMany(anything())).thenResolve([mockPrismaFullConversation]);
    // act
    const result = await chatDS.findOrCreateOneToOneConversation(user1ID, user2ID);
    // expect
    expect(result).toStrictEqual(ChatDataSource._getConversation(mockPrismaFullConversation, user1ID));
    verifyFindMany();
    verify(MockConversationDelegate.create(anything())).never();
  });

  test("should create then return a conversation if it doesn't already exist", async () => {
    // arrange
    when(MockConversationDelegate.findMany(anything())).thenResolve([]);
    when(MockConversationDelegate.create(anything())).thenResolve(mockPrismaFullConversation);
    // act
    const result = await chatDS.findOrCreateOneToOneConversation(user1ID, user2ID);
    // expect
    expect(result).toStrictEqual(ChatDataSource._getConversation(mockPrismaFullConversation, user1ID));
    verifyFindMany();
    verify(MockConversationDelegate.create(deepEqual({
      data: {
        type: ConversationType.ONE_TO_ONE,
        participants: {connect: [{id: user1ID}, {id: user2ID}]},
        createdAt: mockDate
      },
      include: {
        participants: {include: {user: true}},
        messages: {
          orderBy: {sentAt: 'desc'},
          include: {medias: true, seenBy: true, deliveredTo: true}
        }
      }
    }))).once();
  });
});

describe('getConversations', () => {
  it('should return a list of conversations', async () => {
    // arrange
    when(MockConversationDelegate.findMany(anything())).thenResolve([mockPrismaFullConversation]);
    // act
    const result = await chatDS.getConversations(user1ID);
    // assert
    expect(result).toStrictEqual([ChatDataSource._getConversation(mockPrismaFullConversation, user1ID)]);
    verify(MockConversationDelegate.findMany(deepEqual({
      where: {participants: {some: {id: user1ID}}},
      include: {
        participants: {include: {user: true}},
        messages: {
          orderBy: {sentAt: 'desc'},
          include: {medias: true, seenBy: true, deliveredTo: true}
        }
      },
      orderBy: {updatedAt: 'desc'}
    }))).once();
  });
});

describe('sendMessage', () => {
  it('should send a message', async () => {
    // arrange
    const args: SendMessageArgs = {
      conversationID: 911,
      senderID: 'sender ID',
      text: 'Hello world',
      medias: [mockMedia, mockMedia]
    };
    when(MockMessageDelegate.create(anything())).thenResolve(mockPrismaMessage);
    // act
    const result = await chatDS.sendMessage(args);
    // assert
    expect(result).toStrictEqual(ChatDataSource._getMessage(mockPrismaMessage));
    verify(MockMessageDelegate.create(deepEqual({
      data: {
        conversationID: args.conversationID,
        senderID: args.senderID,
        text: args.text,
        sentAt: mockDate,
        medias: args.medias ? {
          create: args.medias,
        } : undefined
      },
      include: {
        medias: true,
        seenBy: true,
        deliveredTo: true,
      },
    }))).once();
  });
});

describe('canSendMessage', () => {
  const conversationID = 911;
  const senderID = 'sender IDDDDD';

  it(
    'should return true if there is a conversation that has a participant with the senderID',
    async () => {
      // arrange
      when(MockConversationDelegate.findMany(anything())).thenResolve([mockPrismaConversation]);
      // act
      const result = await chatDS.canSendMessage(conversationID, senderID);
      // assert
      expect(result).toBe(true);
      verify(MockConversationDelegate.findMany(deepEqual({
        where: {id: conversationID, participants: {some: {id: senderID}}}
      }))).once();
    }
  );

  it(
    'should return false if there is no conversation that has a participant with the senderID',
    async () => {
      // arrange
      when(MockConversationDelegate.findMany(anything())).thenResolve([]);
      // act
      const result = await chatDS.canSendMessage(conversationID, senderID);
      // assert
      expect(result).toBe(false);
      verify(MockConversationDelegate.findMany(deepEqual({
        where: {id: conversationID, participants: {some: {id: senderID}}}
      }))).once();
    }
  );
});