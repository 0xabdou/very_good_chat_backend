import Context from "../../../../src/shared/context";
import {
  anything,
  deepEqual,
  instance,
  mock,
  reset,
  verify,
  when
} from "ts-mockito";
import ChatDataSource, {MinimalConversation} from "../../../../src/features/chat/data/chat-data-source";
import ChatResolver, {
  MessageSubscriptionPayload,
  TypingSubscriptionPayload
} from "../../../../src/features/chat/graphql/resolver";
import {
  Conversation,
  ConversationType,
  Media,
  MediaType,
  Message,
  SendMessageInput,
  Typing
} from "../../../../src/features/chat/graphql/types";
import {
  mockConversation,
  mockGraphQLUser,
  mockMessage,
  mockTyping
} from "../../../mock-objects";
import {ApolloError, UserInputError} from "apollo-server-express";
import FileUtils from "../../../../src/shared/utils/file-utils";
import {FileUpload} from "graphql-upload";
import {IUploader} from "../../../../src/shared/apis/uploader";
import {Publisher, ResolverFilterData} from "type-graphql";
import BlockDataSource
  from "../../../../src/features/block/data/block-data-source";

const MockChatDS = mock<ChatDataSource>();
const MockBlockDS = mock<BlockDataSource>();
const MockFileUtils = mock<FileUtils>();
const MockUploader = mock<IUploader>();
const MockMessagePublish = mock<{ pub: Publisher<MessageSubscriptionPayload> }>();
const MockTypingPublish = mock<{ pub: Publisher<TypingSubscriptionPayload> }>();
const userID = 'userIDDDD';
const context = {
  userID,
  toolBox: {
    dataSources: {
      chatDS: instance(MockChatDS),
      blockDS: instance(MockBlockDS),
      uploader: instance(MockUploader),
    },
    utils: {
      file: instance(MockFileUtils)
    }
  }
} as Context;

const resolver = new ChatResolver();

beforeEach(() => {
  reset(MockChatDS);
  reset(MockFileUtils);
  reset(MockUploader);
  reset(MockMessagePublish);
  reset(MockTypingPublish);
  reset(MockBlockDS);
});

describe('getOrCreateOTOConversation', () => {
  const otherUserID = mockConversation.participants[0].id;
  it(
    'The returned conversation should have canChat set to true if there is no block',
    async () => {
      // arrange
      when(MockChatDS.findOrCreateOneToOneConversation(anything(), anything()))
        .thenResolve(mockConversation);
      when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve(undefined);
      // act
      const result = await resolver.getOrCreateOneToOneConversation(context, otherUserID);
      // assert
      expect(result).toStrictEqual(mockConversation);
      verify(MockChatDS.findOrCreateOneToOneConversation(userID, otherUserID)).once();
      verify(MockBlockDS.getBlockStatus(userID, otherUserID)).once();
    }
  );

  it(
    'The returned conversation should have canChat set to true if there is a block',
    async () => {
      // arrange
      when(MockChatDS.findOrCreateOneToOneConversation(anything(), anything()))
        .thenResolve(mockConversation);
      when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve("blocked");
      // act
      const result = await resolver.getOrCreateOneToOneConversation(context, otherUserID);
      // assert
      expect(result).toStrictEqual({...mockConversation, canChat: false});
      verify(MockChatDS.findOrCreateOneToOneConversation(userID, otherUserID)).once();
      verify(MockBlockDS.getBlockStatus(userID, otherUserID)).once();
    }
  );
});

describe('getConversations', () => {
  it(
    'the returned conversations should have the canChat field set accordingly',
    async () => {
      // arrange
      const otherUserID1 = "ALDJALSJ23";
      const otherUserID2 = "KDJSAKJD32894";
      const otherUserID3 = "KDJSAKJD32342342894";
      const otherUserID4 = "HABAKSOI:DJLAS()";
      const convs: Conversation[] = [
        {
          ...mockConversation,
          type: ConversationType.ONE_TO_ONE,
          participants: [{...mockGraphQLUser, id: otherUserID1}]
        },
        {
          ...mockConversation,
          type: ConversationType.GROUP,
          participants: [{...mockGraphQLUser, id: otherUserID2}]
        },
        {
          ...mockConversation,
          type: ConversationType.ONE_TO_ONE,
          participants: [{...mockGraphQLUser, id: otherUserID3}]
        },
        {
          ...mockConversation,
          type: ConversationType.ONE_TO_ONE,
          participants: [{...mockGraphQLUser, id: otherUserID4}]
        }
      ];
      when(MockChatDS.getConversations(anything())).thenResolve(convs);
      when(MockBlockDS.getBlockStatus(userID, otherUserID1)).thenResolve("blocking");
      when(MockBlockDS.getBlockStatus(userID, otherUserID3)).thenResolve("blocked");
      when(MockBlockDS.getBlockStatus(userID, otherUserID4)).thenResolve(undefined);
      // act
      const result = await resolver.getConversations(context);
      // assert
      expect(result).toStrictEqual([
        {...convs[0], canChat: false},
        convs[1],
        {...convs[2], canChat: false},
        convs[3],
      ]);
      verify(MockChatDS.getConversations(userID)).once();
      verify(MockBlockDS.getBlockStatus(userID, otherUserID1)).once();
      verify(MockBlockDS.getBlockStatus(userID, otherUserID2)).never();
      verify(MockBlockDS.getBlockStatus(userID, otherUserID3)).once();
      verify(MockBlockDS.getBlockStatus(userID, otherUserID4)).once();
    }
  );
});

describe("typing", () => {
  const conversationID = 123123;
  const started = true;

  const act = () => resolver.typing(
    context,
    instance(MockTypingPublish).pub,
    {conversationID, started}
  );

  it("should throw an error if the user is not a member of the conversation", async () => {
    // arrange
    when(MockChatDS.getMinimalConversation(anything(), anything())).thenResolve(null);
    // act
    let error: ApolloError | undefined;
    try {
      await act();
    } catch (e) {
      error = e;
    }
    // assert
    expect(error).not.toBeUndefined();
    verify(MockChatDS.getMinimalConversation(conversationID, userID)).once();
    verify(MockTypingPublish.pub(anything())).never();
  });

  it(
    "should notify subscribers, and return the typing object otherwise",
    async () => {
      // arrange
      const otherUserID = "zblbola";
      const minConv: MinimalConversation = {
        id: conversationID,
        type: ConversationType.ONE_TO_ONE,
        participantsIDs: [userID, otherUserID]
      };
      when(MockChatDS.getMinimalConversation(anything(), anything())).thenResolve(minConv);
      const expected: Typing = {
        conversationID,
        userID,
        started: true
      };
      // act
      const result = await act();
      // assert
      expect(result).toStrictEqual(expected);
      verify(MockTypingPublish.pub(deepEqual({
        typing: expected,
        receivers: [otherUserID]
      }))).once();
    }
  );
});

describe("typings", () => {
  describe("typingsFilter", () => {
    it("should return false if userID is not among receivers", () => {
      // arrange
      const context = {connection: {context: {userID}}} as Context;
      const payload: TypingSubscriptionPayload = {
        typing: mockTyping, receivers: ["zblbola", "tiwliwla"]
      };
      // act
      const result = ChatResolver.typingsFilter({
        context,
        payload,
      } as any);
      // assert
      expect(result).toBe(false);
    });

    it("should return true if userID is among receivers", () => {
      // arrange
      const context = {connection: {context: {userID}}} as Context;
      const payload: TypingSubscriptionPayload = {
        typing: mockTyping, receivers: ["zblbola", userID, "tiwliwla"]
      };
      // act
      const result = ChatResolver.typingsFilter({
        context,
        payload,
      } as any);
      // assert
      expect(result).toBe(true);
    });
  });
  test("typings", () => {
    // arrange
    const payload: TypingSubscriptionPayload = {
      typing: mockTyping, receivers: ["zblbola", userID, "tiwliwla"]
    };
    // act
    const result = resolver.typings(payload);
    // assert
    expect(result).toStrictEqual(mockTyping);
  });
});

describe('sendMessage', () => {
  const getThrownError = async (input: SendMessageInput) => {
    try {
      await resolver.sendMessage(context, input, instance(MockMessagePublish).pub);
    } catch (e) {
      return e;
    }
  };

  it('should throw a validation error if text and medias are null', async () => {
    // arrange
    const input: SendMessageInput = {conversationID: 123};
    // act
    const error = await getThrownError(input) as UserInputError;
    // assert
    expect(error).toBeTruthy();
  });

  it('should throw a validation error if text is null and medias is empty', async () => {
    // arrange
    const input: SendMessageInput = {conversationID: 123, medias: []};
    // act
    const error = await getThrownError(input) as UserInputError;
    // assert
    expect(error).toBeTruthy();
  });

  it('should throw a validation error if medias length > 10', async () => {
    // arrange
    const input: SendMessageInput = {
      conversationID: 123,
      medias: Array.from({length: 11}, () => ({}) as Promise<FileUpload>)
    };
    // act
    const error = getThrownError(input);
    // assert
    expect(error).toBeTruthy();
  });

  const input: SendMessageInput = {
    conversationID: 123,
    text: 'Hello',
    medias: Array.from({length: 10}, () => ({}) as Promise<FileUpload>)
  };

  it(
    'should throw an error if the sender is not a participant in the conversation',
    async () => {
      // arrange
      when(MockChatDS.getMinimalConversation(anything(), anything())).thenResolve(null);
      // act
      const error = await getThrownError(input) as ApolloError;
      // assert
      expect(error.extensions.code).toBe('MESSAGE_CANNOT_BE_SENT');
      verify(MockChatDS.getMinimalConversation(input.conversationID, userID)).once();
    }
  );

  const otherUserID = "ZBLBOLA";
  const minCov: MinimalConversation = {
    id: 11324,
    type: ConversationType.ONE_TO_ONE,
    participantsIDs: [userID, otherUserID]
  };

  describe("if the conversation is of type ONE_TO_ONE", () => {
    it(
      'should throw an error if the sender is blocking the receiver',
      async () => {
        // arrange
        when(MockChatDS.getMinimalConversation(anything(), anything()))
          .thenResolve(minCov);
        when(MockBlockDS.getBlockStatus(anything(), anything()))
          .thenResolve("blocking");
        // act
        const error = await getThrownError(input) as ApolloError;
        // assert
        expect(error.extensions.code).toBe("BLOCKING");
        verify(MockChatDS.getMinimalConversation(input.conversationID, userID)).once();
        verify(MockBlockDS.getBlockStatus(userID, otherUserID)).once();
      }
    );

    it(
      'should throw an error if the sender is blocked by the receiver',
      async () => {
        // arrange
        when(MockChatDS.getMinimalConversation(anything(), anything()))
          .thenResolve(minCov);
        when(MockBlockDS.getBlockStatus(anything(), anything()))
          .thenResolve("blocked");
        // act
        const error = await getThrownError(input) as ApolloError;
        // assert
        expect(error.extensions.code).toBe("BLOCKED");
        verify(MockChatDS.getMinimalConversation(input.conversationID, userID)).once();
        verify(MockBlockDS.getBlockStatus(userID, otherUserID)).once();
      }
    );
  });

  it('should send the message if all is good', async () => {
    // arrange
    // user can send message
    when(MockChatDS.getMinimalConversation(anything(), anything())).thenResolve(minCov);
    when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve(undefined);
    // stub temp file saving
    const medias: Media[] = Array.from({length: input.medias!.length}, (_, i) => {
      return {url: `spoppah_${i}.jpeg`, type: MediaType.IMAGE};
    });
    let i = 0;
    const getMedia = () => medias[i++];
    when(MockFileUtils.saveConversationMedia(anything(), anything())).thenCall(getMedia);
    // stub message sending
    when(MockChatDS.sendMessage(anything())).thenResolve(mockMessage);
    // act
    const result = await resolver.sendMessage(context, input, instance(MockMessagePublish).pub);
    // assert
    expect(result).toStrictEqual(mockMessage);
    verify(MockChatDS.sendMessage(deepEqual({
      conversationID: input.conversationID,
      senderID: userID,
      text: input.text,
      medias,
    }))).once();
    verify(MockMessagePublish.pub(deepEqual({
      message: mockMessage, receivers: minCov.participantsIDs
    }))).once();
  });
});

describe('messages(Delivered/Seen)', () => {
  const messages: Message[] = [{...mockMessage, id: 0}, {
    ...mockMessage,
    id: 1
  }];
  it('should return the number of delivered messages and notify subscriptions', async () => {
    // arrange
    const cIDs = [1, 2];
    when(MockChatDS.messagesDelivered(anything(), anything())).thenResolve(messages);
    // act
    const result = await resolver.messagesDelivered(context, instance(MockMessagePublish).pub, cIDs);
    // assert
    expect(result).toStrictEqual(messages.length);
    verify(MockChatDS.messagesDelivered(cIDs, userID)).once();
    messages.forEach(message => verify(MockMessagePublish.pub(deepEqual({
      message,
      update: true
    }))));
  });

  it('should return the number of delivered messages and notify subscriptions', async () => {
    // arrange
    const cID = 123123;
    when(MockChatDS.messagesSeen(anything(), anything())).thenResolve(messages);
    // act
    const result = await resolver.messagesSeen(context, instance(MockMessagePublish).pub, cID);
    // assert
    expect(result).toStrictEqual(messages.length);
    verify(MockChatDS.messagesSeen(cID, userID)).once();
    messages.forEach(message => verify(MockMessagePublish.pub(deepEqual({
      message,
      update: true
    }))));
  });
});

describe('messages', () => {
  describe('filter', () => {
    const context = {connection: {context: {userID}}};
    it("should return true, if it's an update, and the userID is the senderID", () => {
      // act
      const result = ChatResolver.messagesFilter({
        context,
        payload: {update: true, message: {...mockMessage, senderID: userID}},
      } as ResolverFilterData<MessageSubscriptionPayload, any, Context>);
      // assert
      expect(result).toBe(true);
    });
    it("should return false, if it's an update, and the userID is not the senderID", () => {
      // act
      const result = ChatResolver.messagesFilter({
        context: context,
        payload: {
          update: true,
          message: {...mockMessage, senderID: 'zbboblblajsdlada'}
        },
      } as ResolverFilterData<MessageSubscriptionPayload, any, Context>);
      // assert
      expect(result).toBe(false);
    });
    it("should return false, if it's not an update, there are no receivers", () => {
      // act
      const result = ChatResolver.messagesFilter({
        context: context,
        payload: {message: mockMessage},
      } as ResolverFilterData<MessageSubscriptionPayload, any, Context>);
      // assert
      expect(result).toBe(false);
    });
    it("should return false, if it's not an update, and the userID is not among receivers", () => {
      // act
      const result = ChatResolver.messagesFilter({
        context: context,
        payload: {message: mockMessage, receivers: ['blabl', 'yohoo']},
      } as ResolverFilterData<MessageSubscriptionPayload, any, Context>);
      // assert
      expect(result).toBe(false);
    });
    it("should return true, if it's not an update, and the userID is among receivers", () => {
      // act
      const result = ChatResolver.messagesFilter({
        context: context,
        payload: {message: mockMessage, receivers: ['blabl', 'yohoo', userID]},
      } as ResolverFilterData<MessageSubscriptionPayload, any, Context>);
      // assert
      expect(result).toBe(true);
    });
  });
  it('should return the message', () => {
    // arrange
    const payload = {
      message: mockMessage,
      update: true,
      receivers: ['blabl', 'yohoo', userID]
    };
    // act
    const result = resolver.messages(payload);
    // assert
    expect(result).toStrictEqual({message: mockMessage, update: true});
  });
});
