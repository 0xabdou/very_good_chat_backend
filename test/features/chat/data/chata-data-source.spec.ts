import {
  ConversationType as PrismaConversationType,
  DeliveryType as PrismaDeliveryType,
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
  FullPrismaDelivery,
  FullPrismaMessage,
  MinimalConversation,
  SendMessageArgs
} from "../../../../src/features/chat/data/chat-data-source";
import {
  mockConversation,
  mockFullPrismaConversation,
  mockFullPrismaMessage,
  mockMedia,
  mockMessage,
  mockPrismaAuthUser,
  mockPrismaMedia,
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
const MockDeliveryDelegate = mock<Prisma.DeliveryDelegate<any>>();
const user1ID = 'user1IDDD';
const user2ID = 'user2IDDD';
const [spy, mockDate] = mockTheDate();

const chatDS = new ChatDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.conversation).thenReturn(instance(MockConversationDelegate));
  when(MockPrismaClient.message).thenReturn(instance(MockMessageDelegate));
  when(MockPrismaClient.delivery).thenReturn(instance(MockDeliveryDelegate));
});

beforeEach(() => {
  reset(MockConversationDelegate);
  reset(MockMessageDelegate);
  reset(MockDeliveryDelegate);
});

afterAll(() => {
  spy.mockRestore();
});

describe('parsers', () => {
  const userID = 'userIIIIIDDDDDDD';
  const inputConversation: FullPrismaConversation = {
    ...mockFullPrismaConversation,
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
    const result = ChatDataSource._getMessage(mockFullPrismaMessage);
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
          include: {medias: true, deliveries: true},
          take: 30,
        }
      }
    }))).once();
  };

  test('should only return a conversation if it already exists', async () => {
    // arrange
    when(MockConversationDelegate.findMany(anything())).thenResolve([mockFullPrismaConversation]);
    // act
    const result = await chatDS.findOrCreateOneToOneConversation(user1ID, user2ID);
    // expect
    expect(result).toStrictEqual(ChatDataSource._getConversation(mockFullPrismaConversation, user1ID));
    verifyFindMany();
    verify(MockConversationDelegate.create(anything())).never();
  });

  test("should create then return a conversation if it doesn't already exist", async () => {
    // arrange
    when(MockConversationDelegate.findMany(anything())).thenResolve([]);
    when(MockConversationDelegate.create(anything())).thenResolve(mockFullPrismaConversation);
    // act
    const result = await chatDS.findOrCreateOneToOneConversation(user1ID, user2ID);
    // expect
    expect(result).toStrictEqual(ChatDataSource._getConversation(mockFullPrismaConversation, user1ID));
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
          include: {medias: true, deliveries: true}
        }
      }
    }))).once();
  });
});

describe('getConversations', () => {
  it('should return a list of conversations', async () => {
    // arrange
    const convs: FullPrismaConversation[] = [
      {
        ...mockFullPrismaConversation,
        messages: [
          {
            ...mockFullPrismaMessage,
            sentAt: mockDate
          }
        ]
      },
      {
        ...mockFullPrismaConversation,
        messages: [
          {
            ...mockFullPrismaMessage,
            sentAt: new Date(mockDate.getTime() + 100000)
          }
        ]
      }
    ];
    const expected: Conversation[] = [
      ChatDataSource._getConversation(convs[1], user1ID),
      ChatDataSource._getConversation(convs[0], user1ID),
    ];
    when(MockConversationDelegate.findMany(anything())).thenResolve(convs);
    // act
    const result = await chatDS.getConversations(user1ID);
    // assert
    expect(result).toStrictEqual(expected);
    verify(MockConversationDelegate.findMany(deepEqual({
      where: {participants: {some: {id: user1ID}}},
      include: {
        participants: {include: {user: true}},
        messages: {
          orderBy: {sentAt: 'desc'},
          include: {medias: true, deliveries: true},
          take: 30,
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
    when(MockMessageDelegate.create(anything())).thenResolve(mockFullPrismaMessage);
    // act
    const result = await chatDS.sendMessage(args);
    // assert
    expect(result).toStrictEqual(ChatDataSource._getMessage(mockFullPrismaMessage));
    verify(MockMessageDelegate.create(deepEqual({
      data: {
        conversationID: args.conversationID,
        senderID: args.senderID,
        text: args.text,
        medias: args.medias ? {
          create: args.medias,
        } : undefined
      },
      include: {medias: true, deliveries: true},
    }))).once();
  });
});

describe('getMinimalConversation', () => {
  const conversationID = 911;
  const senderID = 'sender IDDDDD';
  it(
    'should return a minimal conversation that has a participant with the senderID if it exists',
    async () => {
      // arrange
      when(MockConversationDelegate.findMany(anything())).thenResolve([mockFullPrismaConversation]);
      const expected: MinimalConversation = {
        id: mockFullPrismaConversation.id,
        type: ConversationType[mockFullPrismaConversation.type],
        participantsIDs: mockFullPrismaConversation.participants.map(p => p.id)
      };
      // act
      const result = await chatDS.getMinimalConversation(conversationID, senderID);
      // assert
      expect(result).toStrictEqual(expected);
      verify(MockConversationDelegate.findMany(deepEqual({
        where: {id: conversationID, participants: {some: {id: senderID}}},
        include: {participants: true}
      }))).once();
    }
  );

  it(
    'should return null if there is no conversation that has a participant with the senderID',
    async () => {
      // arrange
      when(MockConversationDelegate.findMany(anything())).thenResolve([]);
      // act
      const result = await chatDS.getMinimalConversation(conversationID, senderID);
      // assert
      expect(result).toBeNull();
      verify(MockConversationDelegate.findMany(deepEqual({
        where: {id: conversationID, participants: {some: {id: senderID}}},
        include: {participants: true}
      }))).once();
    }
  );
});

describe('messages(Delivered/Seen)', () => {
  const mIDs = [123123, 234235];
  const messages: FullPrismaMessage[] = mIDs.map(id => ({
    ...mockFullPrismaMessage, id,
  }));
  const deliveries: FullPrismaDelivery[] = messages.map(message => ({
    userID: 'zblbola',
    messageID: message.id,
    type: PrismaDeliveryType.DELIVERED,
    date: new Date(),
    message,
  }));
  const userID = 'zblbolaaaa';

  it('Delivered', async () => {
    // arrange
    const cIDs = [12312424, 234235235];
    const convs: FullPrismaConversation[] = messages.map((message, idx) => ({
      ...mockFullPrismaConversation,
      id: cIDs[idx],
      messages: [message]
    }));
    when(MockConversationDelegate.findMany(anything())).thenResolve(convs);
    let i = 0;
    const getDelivery = () => deliveries[i++];
    when(MockDeliveryDelegate.create(anything())).thenCall(getDelivery);
    // act
    const result = await chatDS.messagesDelivered(cIDs, userID);
    // assert
    expect(result).toStrictEqual(messages.map(ChatDataSource._getMessage));
    verify(MockConversationDelegate.findMany(deepEqual({
      where: {
        id: {in: cIDs},
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
    }))).once();
    mIDs.forEach(id => {
      verify(MockDeliveryDelegate.create(deepEqual({
        data: {
          userID: userID,
          messageID: id,
          type: PrismaDeliveryType.DELIVERED
        },
        include: {message: {include: {deliveries: true, medias: true}}}
      }))).once();
    });
  });

  it('Seen', async () => {
    // arrange
    const cID = 12441221;
    const conv: FullPrismaConversation = {
      ...mockFullPrismaConversation,
      id: cID,
      messages,
    };
    when(MockConversationDelegate.findMany(anything())).thenResolve([conv]);
    let i = 0;
    const getDelivery = () => deliveries[i++];
    when(MockDeliveryDelegate.create(anything())).thenCall(getDelivery);
    // act
    const result = await chatDS.messagesSeen(cID, userID);
    // assert
    expect(result).toStrictEqual(messages.map(ChatDataSource._getMessage));
    verify(MockConversationDelegate.findMany(deepEqual({
      where: {
        id: cID,
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
    }))).once();
    mIDs.forEach(id => {
      verify(MockDeliveryDelegate.create(deepEqual({
        data: {
          userID: userID,
          messageID: id,
          type: PrismaDeliveryType.SEEN,
          date: mockDate
        },
        include: {message: {include: {deliveries: true, medias: true}}}
      }))).once();
    });
  });
});