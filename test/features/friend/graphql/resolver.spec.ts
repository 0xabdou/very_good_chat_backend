import Context from "../../../../src/shared/context";
import {anything, instance, mock, resetCalls, verify, when} from "ts-mockito";
import FriendDataSource
  from "../../../../src/features/friend/data/friend-data-source";
import UserDataSource
  from "../../../../src/features/user/data/user-data-source";
import FriendResolver from "../../../../src/features/friend/graphql/resolver";
import {ApolloError} from "apollo-server-express";
import {mockFriendship, mockGraphQLUser} from "../../../mock-objects";
import {
  Friend,
  FriendRequests,
  Friendship,
  FriendshipInfo,
  FriendshipStatus
} from "../../../../src/features/friend/graphql/types";
import {GerUserArgs} from "../../../../src/features/user/graphql/types";
import NotificationDataSource
  from "../../../../src/features/notification/data/notification-data-source";
import BlockDataSource
  from "../../../../src/features/block/data/block-data-source";

const MockFriendDS = mock<FriendDataSource>();
const MockUserDS = mock<UserDataSource>();
const MockBlockDS = mock<BlockDataSource>();
const MockNotificationDS = mock<NotificationDataSource>();
const userID = 'user1ID';
const user2ID = 'user2ID';

const context = {
  userID,
  toolBox: {
    dataSources: {
      userDS: instance(MockUserDS),
      friendDS: instance(MockFriendDS),
      blockDS: instance(MockBlockDS),
      notificationDS: instance(MockNotificationDS)
    }
  }
} as Context;
const resolver = new FriendResolver();

beforeEach(() => {
  resetCalls(MockUserDS);
  resetCalls(MockFriendDS);
  resetCalls(MockBlockDS);
  resetCalls(MockNotificationDS);
});

describe('getFriends', () => {
  it('should forward the call to friendDS', () => {
    // arrange
    const promise = new Promise<Friend[]>(r => r([]));
    when(MockFriendDS.getFriends(anything())).thenReturn(promise);
    // act
    const result = resolver.getFriends(context);
    // assert
    expect(result).toBe(promise);
    verify(MockFriendDS.getFriends(userID)).once();
  });
});

describe('getFriendRequests', () => {
  it('should return friend requests', async () => {
    // arrange
    const requests: FriendRequests = {
      sent: [],
      received: [
        {user: mockGraphQLUser, date: new Date()}
      ]
    };
    when(MockFriendDS.getFriendRequests(anything())).thenResolve(requests);
    // act
    const result = await resolver.getFriendRequests(context);
    // assert
    expect(result).toStrictEqual(requests);
    verify(MockFriendDS.getFriendRequests(userID)).once();
  });
});

describe('getFriendshipInfo', () => {
  const args: GerUserArgs = {username: 'usernammmmmmmme'};
  const act = () => resolver.getFriendshipInfo(context, args);


  it('should throw USER_NOT_FOUND if the user was not found', async () => {
    // arrange
    when(MockUserDS.getUser(anything())).thenResolve(null);
    // act
    let error: ApolloError | undefined;
    try {
      await act();
    } catch (e) {
      error = e;
    }
    expect(error?.extensions.code).toBe('USER_NOT_FOUND');
  });

  it(
    'should return BLOCKED status if current user is blocked by the other user',
    async () => {
      // arrange
      when(MockUserDS.getUser(anything())).thenResolve(mockGraphQLUser);
      when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve('blocked');
      const expected: FriendshipInfo = {
        friendship: {status: FriendshipStatus.BLOCKED},
        user: mockGraphQLUser
      };
      // act
      const result = await act();
      // assert
      expect(result).toStrictEqual(expected);
      verify(MockUserDS.getUser(args)).once();
      verify(MockBlockDS.getBlockStatus(userID, mockGraphQLUser.id)).once();
      verify(MockFriendDS.getFriendship(anything(), anything())).never();
    }
  );

  it(
    'should return BLOCKING status if current user is blocking the other user',
    async () => {
      // arrange
      when(MockUserDS.getUser(anything())).thenResolve(mockGraphQLUser);
      when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve('blocking');
      const expected: FriendshipInfo = {
        friendship: {status: FriendshipStatus.BLOCKING},
        user: mockGraphQLUser
      };
      // act
      const result = await act();
      // assert
      expect(result).toStrictEqual(expected);
      verify(MockUserDS.getUser(args)).once();
      verify(MockBlockDS.getBlockStatus(userID, mockGraphQLUser.id)).once();
      verify(MockFriendDS.getFriendship(anything(), anything())).never();
    }
  );

  it('should return friendship info if no one is blocking anyone', async () => {
    // arrange
    when(MockUserDS.getUser(anything())).thenResolve(mockGraphQLUser);
    when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve(undefined);
    when(MockFriendDS.getFriendship(anything(), anything()))
      .thenResolve(mockFriendship);
    // act
    const result = await act();
    // assert
    const expected: FriendshipInfo = {
      friendship: mockFriendship,
      user: mockGraphQLUser,
    };
    expect(result).toStrictEqual(expected);
    verify(MockUserDS.getUser(args)).once();
    verify(MockFriendDS.getFriendship(userID, mockGraphQLUser.id)).once();
  });
});

describe('sendFriendRequest', () => {
  const getThrownError = async (): Promise<ApolloError | undefined> => {
    try {
      await resolver.sendFriendRequest(context, user2ID);
    } catch (e) {
      return e;
    }
  };

  it(
    'should an error with the code "BLOCKING" if the current user is blocking the other user',
    async () => {
      // arrange
      when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve('blocking');
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe('BLOCKING');
      verify(MockBlockDS.getBlockStatus(userID, user2ID)).once();
      verify(MockFriendDS.sendFriendRequest(anything(), anything())).never();
    },
  );

  it(
    'should an error with the code "BLOCKED" if the current user is blocked by the other user',
    async () => {
      // arrange
      when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve('blocked');
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe('BLOCKED');
      verify(MockBlockDS.getBlockStatus(userID, user2ID)).once();
      verify(MockFriendDS.sendFriendRequest(anything(), anything())).never();
    },
  );

  it(
    'should send the friend request and return a friendship object if no one is blocking anyone',
    async () => {
      // arrange
      when(MockBlockDS.getBlockStatus(anything(), anything())).thenResolve(undefined);
      when(MockFriendDS.sendFriendRequest(anything(), anything()))
        .thenResolve(mockFriendship);
      // act
      const result = await resolver.sendFriendRequest(context, user2ID);
      // assert
      expect(result).toStrictEqual(mockFriendship);
      verify(MockBlockDS.getBlockStatus(userID, user2ID)).once();
      verify(MockFriendDS.sendFriendRequest(userID, user2ID)).once();
    }
  );
});

describe('acceptFriendRequest', () => {
  it(
    'should return the existing friendship and not send a any notification if it was already accepted',
    async () => {
      // arrange
      const friendship = {status: FriendshipStatus.FRIENDS, date: new Date()};
      when(MockFriendDS.getFriendship(anything(), anything())).thenResolve(friendship);
      // act
      const result = await resolver.acceptFriendRequest(context, user2ID);
      // assert
      expect(result).toStrictEqual(friendship);
      verify(MockFriendDS.getFriendship(userID, user2ID)).once();
      verify(MockFriendDS.acceptFriendRequest(anything(), anything())).never();
      verify(MockNotificationDS.sendRequestAcceptedNotification(anything(), anything()))
        .never();
    },
  );
  it(
    'should accept the friend request and send a notification if it was not already accepted',
    async () => {
      // arrange
      const friendship = {
        status: FriendshipStatus.REQUEST_RECEIVED,
        date: new Date()
      };
      when(MockFriendDS.getFriendship(anything(), anything())).thenResolve(friendship);
      when(MockFriendDS.acceptFriendRequest(anything(), anything()))
        .thenResolve(mockFriendship);
      // act
      const result = await resolver.acceptFriendRequest(context, user2ID);
      // assert
      expect(result).toStrictEqual(mockFriendship);
      verify(MockFriendDS.getFriendship(userID, user2ID)).once();
      verify(MockFriendDS.acceptFriendRequest(userID, user2ID)).once();
      verify(MockNotificationDS.sendRequestAcceptedNotification(userID, user2ID))
        .once();
    },
  );
});

describe('declineFriendRequest', () => {
  it('should forward the call to friendDS.declineFriendRequest', () => {
    // arrange
    const promise = new Promise<Friendship>(r => r(mockFriendship));
    when(MockFriendDS.declineFriendRequest(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.declineFriendRequest(context, user2ID);
    // assert
    expect(result).toBe(promise);
    verify(MockFriendDS.declineFriendRequest(userID, user2ID)).once();
  });
});

describe('cancelFriendRequest', () => {
  it('should forward the call to friendDS.cancelFriendRequest', () => {
    // arrange
    const promise = new Promise<Friendship>(r => r(mockFriendship));
    when(MockFriendDS.cancelFriendRequest(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.cancelFriendRequest(context, user2ID);
    // assert
    expect(result).toBe(promise);
    verify(MockFriendDS.cancelFriendRequest(userID, user2ID)).once();
  });
});

describe('unfriend', () => {
  it('should forward the call to friendDS.unfriend', () => {
    // arrange
    const promise = new Promise<Friendship>(r => r(mockFriendship));
    when(MockFriendDS.unfriend(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.unfriend(context, user2ID);
    // assert
    expect(result).toBe(promise);
    verify(MockFriendDS.unfriend(userID, user2ID)).once();
  });
});