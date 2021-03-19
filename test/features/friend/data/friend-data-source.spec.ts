import {Friend, Prisma, PrismaClient} from '@prisma/client';
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
  Friendship,
  FriendshipStatus
} from "../../../../src/features/friend/graphql/types";
import {mockFriend} from "../../../mock-objects";
import {ApolloError} from "apollo-server-express";
import {PrismaClientKnownRequestError} from "@prisma/client/runtime";

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
    const friend: Friend = {
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
    const friend: Friend = {
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
      const friend: Friend = {
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
      const friend: Friend = {...mockFriend, confirmed: true};
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
      const friend: Friend = {...mockFriend, confirmed: false};
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
      expect(error?.extensions.code).toBe(friendErrors.REQUEST_CANCELED);
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
      expect(error?.extensions.code).toBe(friendErrors.REQUEST_CANCELED);
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
      const friend: Friend = {...mockFriend, confirmed: true};
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
      expect(error?.extensions.code).toBe(friendErrors.REQUEST_CANCELED);
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