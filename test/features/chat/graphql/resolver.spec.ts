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
import ChatResolver, {MessageSubscriptionPayload} from "../../../../src/features/chat/graphql/resolver";
import {
  Conversation,
  ConversationType,
  MediaType,
  Message,
  SendMessageInput
} from "../../../../src/features/chat/graphql/types";
import {mockConversation, mockMessage} from "../../../mock-objects";
import {ApolloError, UserInputError} from "apollo-server-express";
import FileUtils from "../../../../src/shared/utils/file-utils";
import {FileUpload} from "graphql-upload";
import {IUploader} from "../../../../src/shared/apis/uploader";
import {Publisher, ResolverFilterData} from "type-graphql";

const MockChatDS = mock<ChatDataSource>();
const MockFileUtils = mock<FileUtils>();
const MockUploader = mock<IUploader>();
const MockPublish = mock<{ pub: Publisher<MessageSubscriptionPayload> }>();
const userID = 'userIDDDD';
const context = {
  userID,
  toolBox: {
    dataSources: {
      chatDS: instance(MockChatDS),
      uploader: instance(MockUploader)
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
  reset(MockPublish);
});

describe('getOrCreateOTOConversation', () => {
  it('should forward the call to chatDS', () => {
    // arrange
    const otherUserID = 'otherUserIDDDD';
    const promise = new Promise<Conversation>(r => r(mockConversation));
    when(MockChatDS.findOrCreateOneToOneConversation(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.getOrCreateOneToOneConversation(context, otherUserID);
    // assert
    expect(result).toBe(promise);
    verify(MockChatDS.findOrCreateOneToOneConversation(userID, otherUserID)).once();
  });
});

describe('getConversations', () => {
  it('should forward the call to chatDS', () => {
    // arrange
    const promise = new Promise<Conversation[]>(r => r([]));
    when(MockChatDS.getConversations(anything())).thenReturn(promise);
    // act
    const result = resolver.getConversations(context);
    // assert
    expect(result).toBe(promise);
    verify(MockChatDS.getConversations(userID)).once();
  });
});

describe('sendMessage', () => {
  const getThrownError = async (input: SendMessageInput) => {
    try {
      await resolver.sendMessage(context, input, instance(MockPublish).pub);
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

  it('should throw an error if the message cannot be sent', async () => {
    // arrange
    when(MockChatDS.getMinimalConversation(anything(), anything())).thenResolve(null);
    // act
    const error = await getThrownError(input) as ApolloError;
    // assert
    expect(error.extensions.code).toBe('MESSAGE_CANNOT_BE_SENT');
    verify(MockChatDS.getMinimalConversation(input.conversationID, userID)).once();
  });

  it('should send the message if all is good', async () => {
    // arrange
    // user can send message
    const minCov: MinimalConversation = {
      id: 11324,
      type: ConversationType.ONE_TO_ONE,
      participantsIDs: ['1313', '13123']
    };
    when(MockChatDS.getMinimalConversation(anything(), anything())).thenResolve(minCov);
    // stub temp file saving
    const tempURLs = Array.from({length: input.medias!.length}, (_, i) => `temp_${i}`);
    let i = 0;
    const getTempURL = () => tempURLs[i++];
    when(MockFileUtils.saveTempFile(anything())).thenCall(getTempURL);
    // stub uploader
    const uploadedURLs = Array.from({length: tempURLs.length}, (_, i) => `up_${i}`);
    let j = 0;
    const getUploadedURL = () => uploadedURLs[j++];
    when(MockUploader.uploadConversationMedia(anything())).thenCall(getUploadedURL);
    // stub media types
    when(MockFileUtils.getMediaType(anything())).thenReturn(MediaType.IMAGE);
    // stub message sending
    when(MockChatDS.sendMessage(anything())).thenResolve(mockMessage);
    // act
    const result = await resolver.sendMessage(context, input, instance(MockPublish).pub);
    // assert
    expect(result).toStrictEqual(mockMessage);
    for (let upload of input.medias!)
      verify(MockFileUtils.saveTempFile(upload)).once();
    for (let url of tempURLs) {
      verify(MockFileUtils.getMediaType(url)).once();
    }
    verify(MockChatDS.sendMessage(deepEqual({
      conversationID: input.conversationID,
      senderID: userID,
      text: input.text,
      medias: input.medias?.map((_, i) => ({
        url: uploadedURLs[i],
        type: MediaType.IMAGE
      }))
    }))).once();
    verify(MockPublish.pub(deepEqual({
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
    const result = await resolver.messagesDelivered(context, instance(MockPublish).pub, cIDs);
    // assert
    expect(result).toStrictEqual(messages.length);
    verify(MockChatDS.messagesDelivered(cIDs, userID)).once();
    messages.forEach(message => verify(MockPublish.pub(deepEqual({
      message,
      update: true
    }))));
  });

  it('should return the number of delivered messages and notify subscriptions', async () => {
    // arrange
    const cID = 123123;
    when(MockChatDS.messagesSeen(anything(), anything())).thenResolve(messages);
    // act
    const result = await resolver.messagesSeen(context, instance(MockPublish).pub, cID);
    // assert
    expect(result).toStrictEqual(messages.length);
    verify(MockChatDS.messagesSeen(cID, userID)).once();
    messages.forEach(message => verify(MockPublish.pub(deepEqual({
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