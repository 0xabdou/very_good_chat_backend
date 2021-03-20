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
  FriendRequests,
  Friendship,
  FriendshipInfo
} from "../../../../src/features/friend/graphql/types";
import {GerUserArgs} from "../../../../src/features/user/graphql/types";

const MockFriendDS = mock<FriendDataSource>();
const MockUserDS = mock<UserDataSource>();
const userID = 'user1ID';
const user2ID = 'user2ID';

const context = {
  userID,
  toolBox: {
    dataSources: {
      userDS: instance(MockUserDS),
      friendDS: instance(MockFriendDS)
    }
  }
} as Context;
const resolver = new FriendResolver();

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

  beforeEach(() => {
    resetCalls(MockUserDS);
    resetCalls(MockFriendDS);
  });

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

  it('should return friendship info if the user was found', async () => {
    // arrange
    when(MockUserDS.getUser(anything())).thenResolve(mockGraphQLUser);
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
  it('should forward the call to friendDS.sendFriendRequest', () => {
    // arrange
    const promise = new Promise<Friendship>(r => r(mockFriendship));
    when(MockFriendDS.sendFriendRequest(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.sendFriendRequest(context, user2ID);
    // assert
    expect(result).toBe(promise);
    verify(MockFriendDS.sendFriendRequest(userID, user2ID)).once();
  });
});

describe('acceptFriendRequest', () => {
  it('should forward the call to friendDS.acceptFriendRequest', () => {
    // arrange
    const promise = new Promise<Friendship>(r => r(mockFriendship));
    when(MockFriendDS.acceptFriendRequest(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.acceptFriendRequest(context, user2ID);
    // assert
    expect(result).toBe(promise);
    verify(MockFriendDS.acceptFriendRequest(userID, user2ID)).once();
  });
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