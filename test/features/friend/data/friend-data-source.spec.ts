import {
  AuthUser,
  Friend as PrismaFriend,
  Prisma,
  PrismaClient,
  User
} from '@prisma/client';
import {
  anything,
  deepEqual,
  instance,
  mock,
  reset,
  resetCalls,
  verify,
  when
} from "ts-mockito";
import FriendDataSource, {friendErrors} from "../../../../src/features/friend/data/friend-data-source";
import {
  Friend,
  FriendRequests,
  Friendship,
  FriendshipStatus
} from "../../../../src/features/friend/graphql/types";
import {mockFriend} from "../../../mock-objects";
import {ApolloError} from "apollo-server-express";
import {PrismaClientKnownRequestError} from "@prisma/client/runtime";
import UserDataSource
  from "../../../../src/features/user/data/user-data-source";

const MockPrisma = mock<PrismaClient>();
const MockFriendDelegate = mock<Prisma.FriendDelegate<any>>();
const friendDS = new FriendDataSource(instance(MockPrisma));
const user1ID = 'user1ID';
const user2ID = 'user2ID';
const p2025Error = new PrismaClientKnownRequestError(
  'Some message', 'P2025', '1'
);

beforeAll(() => {
  when(MockPrisma.friend).thenReturn(instance(MockFriendDelegate));
});
beforeEach(() => {
  resetCalls(MockFriendDelegate);
});

const authUser1: AuthUser = {
  id: 'id1',
  email: 'email1'
};
const authUser2: AuthUser = {
  id: 'id2',
  email: 'email2'
};
const authUser3: AuthUser = {
  id: 'id3',
  email: 'email3'
};
const user1: User = {
  authUserID: authUser1.id,
  username: 'username',
  name: 'name name',
  photoURLSmall: null,
  photoURLSource: null,
  photoURLMedium: null,
  activeStatus: true,
  lastSeen: new Date(),
};
const user2: User = {
  authUserID: authUser2.id,
  username: 'username2',
  name: 'name name2',
  photoURLSmall: null,
  photoURLSource: null,
  photoURLMedium: null,
  activeStatus: true,
  lastSeen: new Date(),
};
const user3: User = {
  authUserID: authUser3.id,
  username: 'username3',
  name: 'name name3',
  photoURLSmall: null,
  photoURLSource: null,
  photoURLMedium: null,
  activeStatus: false,
  lastSeen: new Date(),
};
type FriendUser = PrismaFriend & {
  user1: AuthUser & { user: User },
  user2: AuthUser & { user: User },
};
const sentReq: FriendUser = {
  id: 0,
  user1ID: authUser1.id,
  user2ID: authUser2.id,
  user1: {...authUser1, user: user1},
  user2: {...authUser2, user: user2},
  date: new Date(),
  confirmed: false
};
const receivedReq: FriendUser = {
  id: 1,
  user1ID: authUser3.id,
  user2ID: authUser1.id,
  user1: {...authUser3, user: user3},
  user2: {...authUser1, user: user1},
  date: new Date(),
  confirmed: false
};

describe('getFriends', () => {
  const userID = authUser1.id;

  it('should return a list of friends (active status enabled)', async () => {
    // arrange
    const friend1 = {...sentReq, confirmed: true};
    const friend2 = {...receivedReq, confirmed: true};
    const expected: Friend[] = [
      {
        user: UserDataSource._getGraphQLUser(friend1.user2.user),
        friendshipDate: friend1.date,
        lastSeen: friend1.user2.user.lastSeen
      },
      {
        user: UserDataSource._getGraphQLUser(friend2.user1.user),
        friendshipDate: friend2.date,
        lastSeen: undefined
      }
    ];
    when(MockFriendDelegate.findMany(anything())).thenResolve([friend1, friend2]);
    // act
    const result = await friendDS.getFriends(userID);
    // assert
    expect(result).toStrictEqual(expected);
    verify(MockFriendDelegate.findMany(deepEqual({
      where: {AND: [{confirmed: true}, {OR: [{user1ID: userID}, {user2ID: userID}]}]},
      orderBy: {date: 'desc'},
      include: {user2: {include: {user: true}}, user1: {include: {user: true}}}
    }))).once();
  });

  it('should return a list of friends (active status disabled)', async () => {
    const user = {
      ...sentReq.user1,
      user: {
        ...sentReq.user1.user,
        activeStatus: false
      }
    };
    const friend1 = {
      ...sentReq,
      user1: user,
      confirmed: true
    };
    const friend2 = {
      ...receivedReq,
      user2: user,
      confirmed: true
    };
    // arrange
    const expected: Friend[] = [
      {
        user: UserDataSource._getGraphQLUser(friend1.user2.user),
        friendshipDate: friend1.date,
        lastSeen: undefined
      },
      {
        user: UserDataSource._getGraphQLUser(friend2.user1.user),
        friendshipDate: friend2.date,
        lastSeen: undefined
      }
    ];
    when(MockFriendDelegate.findMany(anything())).thenResolve([friend1, friend2]);
    // act
    const result = await friendDS.getFriends(userID);
    // assert
    expect(result).toStrictEqual(expected);
    verify(MockFriendDelegate.findMany(deepEqual({
      where: {AND: [{confirmed: true}, {OR: [{user1ID: userID}, {user2ID: userID}]}]},
      orderBy: {date: 'desc'},
      include: {user2: {include: {user: true}}, user1: {include: {user: true}}}
    }))).once();
  });
});

describe('getFriendRequests', () => {
  it('should return a list of friend requests', async () => {
    // arrange
    when(MockFriendDelegate.findMany(anything()))
      .thenResolve([sentReq, receivedReq]);
    // act
    const result = await friendDS.getFriendRequests(authUser1.id);
    // assert
    const expected: FriendRequests = {
      sent: [{
        user: {
          id: sentReq.user2.id,
          username: sentReq.user2.user.username,
          name: sentReq.user2.user.name!,
          photoURLMedium: undefined,
          photoURLSource: undefined,
          photoURLSmall: undefined,
        },
        date: sentReq.date
      }],
      received: [{
        user: {
          id: receivedReq.user1.id,
          username: receivedReq.user1.user.username,
          name: receivedReq.user1.user.name!,
          photoURLMedium: undefined,
          photoURLSource: undefined,
          photoURLSmall: undefined,
        },
        date: receivedReq.date
      }]
    };
    expect(result).toStrictEqual(expected);
    verify(MockFriendDelegate.findMany(deepEqual({
      where: {
        AND: [
          {confirmed: false},
          {
            OR: [
              {user1ID: authUser1.id},
              {user2ID: authUser1.id}
            ]
          }
        ]
      },
      orderBy: {date: 'desc'},
      include: {
        user2: {include: {user: true}},
        user1: {include: {user: true}},
      }
    }))).once();
  });
});

describe('geFriendshipStatus', () => {
  it('should return `STRANGERS` if the users have no relation', async () => {
    // arrange
    when(MockFriendDelegate.findMany(anything())).thenResolve([]);
    // act
    const result = await friendDS.getFriendship(user1ID, user2ID);
    // assert
    expect(result).toStrictEqual({status: FriendshipStatus.STRANGERS});
    verify(MockFriendDelegate.findMany(deepEqual({
      where: {
        OR: [
          {user1ID, user2ID},
          {user1ID: user2ID, user2ID: user1ID},
        ]
      }
    }))).once();
  });

  it('should return `FRIENDS` if the users are friends', async () => {
    // arrange
    const friend: PrismaFriend = {
      id: 0,
      user1ID,
      user2ID,
      date: new Date(),
      confirmed: true,
    };
    when(MockFriendDelegate.findMany(anything())).thenResolve([friend]);
    // act
    const result = await friendDS.getFriendship(user1ID, user2ID);
    // assert
    expect(result).toStrictEqual({
      status: FriendshipStatus.FRIENDS,
      date: friend.date
    });
  });

  it('should return `REQUEST_SENT` if the current user sent a request', async () => {
    // arrange
    const friend: PrismaFriend = {
      id: 0,
      user1ID,
      user2ID,
      date: new Date(),
      confirmed: false,
    };
    when(MockFriendDelegate.findMany(anything())).thenResolve([friend]);
    // act
    const result = await friendDS.getFriendship(user1ID, user2ID);
    // assert
    expect(result).toStrictEqual({
      status: FriendshipStatus.REQUEST_SENT,
      date: friend.date
    });
  });

  it('should return `REQUEST_RECEIVED` if the current user received a request',
    async () => {
      // arrange
      const friend: PrismaFriend = {
        id: 0,
        user1ID: user2ID,
        user2ID: user1ID,
        date: new Date(),
        confirmed: false,
      };
      when(MockFriendDelegate.findMany(anything())).thenResolve([friend]);
      // act
      const result = await friendDS.getFriendship(user1ID, user2ID);
      // assert
      expect(result).toStrictEqual({
        status: FriendshipStatus.REQUEST_RECEIVED,
        date: friend.date
      });
    }
  );
});

describe('sendFriendRequest', () => {
  const act = () => friendDS.sendFriendRequest(user1ID, user2ID);
  const getThrownError = async (): Promise<ApolloError | undefined> => {
    try {
      await act();
    } catch (e) {
      return e;
    }
  };

  beforeEach(() => {
    reset(MockFriendDelegate);
  });

  it(
    'should throw ALREADY_FRIENDS if the users are already friends',
    async () => {
      // arrange
      const friend: PrismaFriend = {...mockFriend, confirmed: true};
      when(MockFriendDelegate.findUnique(anything())).thenResolve(friend);
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe(friendErrors.ALREADY_FRIENDS);
      verify(MockFriendDelegate.findUnique(deepEqual({
        where: {
          user1ID_user2ID: {
            user1ID: user2ID,
            user2ID: user1ID
          }
        }
      }))).once();
      verify(MockFriendDelegate.create(anything())).never();
    }
  );

  it(
    'should throw REQUEST_RECEIVED if the request was already received',
    async () => {
      // arrange
      const friend: PrismaFriend = {...mockFriend, confirmed: false};
      when(MockFriendDelegate.findUnique(anything())).thenResolve(friend);
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe(friendErrors.REQUEST_RECEIVED);
      verify(MockFriendDelegate.findUnique(deepEqual({
        where: {
          user1ID_user2ID: {
            user1ID: user2ID,
            user2ID: user1ID
          }
        }
      }))).once();
      verify(MockFriendDelegate.create(anything())).never();
    }
  );

  it(
    'should save the request and return the right result if possible',
    async () => {
      // arrange
      when(MockFriendDelegate.create(anything())).thenResolve(mockFriend);
      // act
      const result = await friendDS.sendFriendRequest(user1ID, user2ID);
      // assert
      const expected: Friendship = {
        status: FriendshipStatus.REQUEST_SENT,
        date: mockFriend.date,
      };
      expect(result).toStrictEqual(expected);
      verify(MockFriendDelegate.create(deepEqual({data: {user1ID, user2ID}})))
        .once();
    }
  );
});

describe('acceptFriendRequest', () => {
  const act = () => friendDS.acceptFriendRequest(user1ID, user2ID);
  const getThrownError = async (): Promise<ApolloError | undefined> => {
    try {
      await act();
    } catch (e) {
      return e;
    }
  };

  it(
    'should throw REQUEST_CANCELED if the request was already canceled',
    async () => {
      // arrange
      when(MockFriendDelegate.update(anything())).thenReject(p2025Error);
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe(friendErrors.REQUEST_REMOVED);
    },
  );

  it('should throw any other thrown error', async () => {
    // arrange
    const thrown = new Error("PFFFFFFF");
    when(MockFriendDelegate.update(anything())).thenReject(thrown);
    // act
    const error = await getThrownError();
    // assert
    expect(error).toBe(thrown);
  });

  it(
    'should accept the request and return the right result if possible',
    async () => {
      // arrange
      when(MockFriendDelegate.update(anything())).thenResolve(mockFriend);
      // act
      const result = await act();
      // assert
      const expected: Friendship = {
        status: FriendshipStatus.FRIENDS,
        date: mockFriend.date
      };
      expect(result).toStrictEqual(expected);
      verify(MockFriendDelegate.update(deepEqual({
        where: {user1ID_user2ID: {user1ID: user2ID, user2ID: user1ID}},
        data: {confirmed: true}
      }))).once();
    }
  );
});

describe('declineFriendRequest', () => {
  const act = () => friendDS.declineFriendRequest(user1ID, user2ID);
  const getThrownError = async (): Promise<ApolloError | undefined> => {
    try {
      await act();
    } catch (e) {
      return e;
    }
  };

  it(
    'should throw REQUEST_CANCELED if the request was already canceled',
    async () => {
      // arrange
      when(MockFriendDelegate.delete(anything())).thenReject(p2025Error);
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe(friendErrors.REQUEST_REMOVED);
    },
  );

  it('should throw any other thrown error', async () => {
    // arrange
    const thrown = new Error("PFFFFFFF");
    when(MockFriendDelegate.delete(anything())).thenReject(thrown);
    // act
    const error = await getThrownError();
    // assert
    expect(error).toBe(thrown);
  });

  it(
    'should decline the request and return the right result if possible',
    async () => {
      // arrange
      when(MockFriendDelegate.delete(anything())).thenResolve(mockFriend);
      // act
      const result = await act();
      // assert
      const expected: Friendship = {status: FriendshipStatus.STRANGERS};
      expect(result).toStrictEqual(expected);
      verify(MockFriendDelegate.delete(deepEqual({
        where: {user1ID_user2ID: {user1ID: user2ID, user2ID: user1ID}},
      }))).once();
    }
  );
});

describe('cancelFriendRequest', () => {
  const act = () => friendDS.cancelFriendRequest(user1ID, user2ID);
  const getThrownError = async (): Promise<ApolloError | undefined> => {
    try {
      await act();
    } catch (e) {
      return e;
    }
  };

  beforeEach(() => {
    reset(MockFriendDelegate);
  });

  it(
    'should throw ALREADY_FRIENDS if the users are already friends',
    async () => {
      // arrange
      const friend: PrismaFriend = {...mockFriend, confirmed: true};
      when(MockFriendDelegate.findUnique(anything())).thenResolve(friend);
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe(friendErrors.ALREADY_FRIENDS);
      verify(MockFriendDelegate.findUnique(deepEqual({
        where: {user1ID_user2ID: {user1ID, user2ID}}
      }))).once();
    }
  );

  it(
    'should throw REQUEST_CANCELED if the request was already canceled',
    async () => {
      // arrange
      when(MockFriendDelegate.delete(anything())).thenReject(p2025Error);
      // act
      const error = await getThrownError();
      // assert
      expect(error?.extensions.code).toBe(friendErrors.REQUEST_REMOVED);
    }
  );

  it('should throw any other thrown error', async () => {
    // arrange
    const thrown = new Error("PFFFFFFF");
    when(MockFriendDelegate.delete(anything())).thenReject(thrown);
    // act
    const error = await getThrownError();
    // assert
    expect(error).toBe(thrown);
  });

  it('should cancel the request and return the right result', async () => {
    // arrange
    when(MockFriendDelegate.delete(anything())).thenResolve(mockFriend);
    // act
    const result = await friendDS.cancelFriendRequest(user1ID, user2ID);
    // assert
    const expected: Friendship = {status: FriendshipStatus.STRANGERS};
    expect(result).toStrictEqual(expected);
    verify(MockFriendDelegate.delete(deepEqual({
      where: {user1ID_user2ID: {user1ID, user2ID}},
    }))).once();
  });
});

describe('unfriend', () => {
  it('should unfriend and return the right result', async () => {
    // arrange
    when(MockFriendDelegate.deleteMany(anything())).thenResolve({count: 1});
    // act
    const result = await friendDS.unfriend(user1ID, user2ID);
    // assert
    const expected: Friendship = {status: FriendshipStatus.STRANGERS};
    expect(result).toStrictEqual(expected);
    verify(MockFriendDelegate.deleteMany(deepEqual({
      where: {
        OR: [
          {user1ID, user2ID},
          {user1ID: user2ID, user2ID: user1ID},
        ]
      }
    }))).once();
  });
});