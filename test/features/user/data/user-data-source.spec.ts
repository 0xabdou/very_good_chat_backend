import {
  anything,
  deepEqual,
  instance,
  mock,
  resetCalls,
  verify,
  when
} from "ts-mockito";
import {Prisma, PrismaClient} from "@prisma/client";
import UserDataSource, {UpdateUserArgs} from "../../../../src/features/user/data/user-data-source";
import {
  mockCreateUserArgs,
  mockGraphQLUser,
  mockMe,
  mockPrismaUser,
  mockTheDate
} from "../../../mock-objects";
import {GerUserArgs} from "../../../../src/features/user/graphql/types";

const MockPrismaClient = mock<PrismaClient>();
const MockUserDelegate = mock<Prisma.UserDelegate<any>>();
let [spy, mockDate] = mockTheDate();

const userDS = new UserDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.user).thenReturn(instance(MockUserDelegate));
});

beforeEach(() => {
  resetCalls(MockUserDelegate);
});

afterAll(() => {
  spy.mockRestore();
});

describe('getMe', () => {
  const userID = 'userIIDD';

  it('should return null if no user exists with that id', async () => {
    // arrange
    when(MockUserDelegate.findUnique(anything())).thenResolve(null);
    // act
    const result = await userDS.getMe(userID);
    // assert
    expect(result).toBeNull();
    verify(MockUserDelegate.findUnique(deepEqual({where: {authUserID: userID}}))).once();
  });

  it('should return a Me object if a user exists with that id', async () => {
    // arrange
    when(MockUserDelegate.findUnique(anything())).thenResolve(mockPrismaUser);
    // act
    const result = await userDS.getMe(userID);
    // assert
    expect(result).toStrictEqual(mockMe);
    verify(MockUserDelegate.findUnique(deepEqual({where: {authUserID: userID}}))).once();
  });
});

describe('getUser', () => {
  it('should return null if username and id are both undefined', async () => {
    // arrange
    const args: GerUserArgs = {};
    // act
    const result = await userDS.getUser(args);
    // assert
    expect(result).toBeNull();
    verify(MockUserDelegate.findUnique(anything())).never();
  });

  it('should find the user by username if it was defined', async () => {
    // arrange
    const args: GerUserArgs = {username: 'usernammmme'};
    // act
    await userDS.getUser(args);
    // assert
    verify(MockUserDelegate.findUnique(deepEqual(
      {
        where: {username: args.username}
      }))).once();
  });

  it('should find the user by id if it was defined', async () => {
    // arrange
    const args: GerUserArgs = {id: 'idddddddddd'};
    // act
    await userDS.getUser(args);
    // assert
    verify(MockUserDelegate.findUnique(deepEqual(
      {where: {authUserID: args.id}}
    ))).once();
  });

  it('should find the user only by id if both id and username are defined',
    async () => {
      // arrange
      const args: GerUserArgs = {id: 'idddddddddd', username: 'usernameeeee'};
      // act
      await userDS.getUser(args);
      // assert
      verify(MockUserDelegate.findUnique(anything())).once();
    }
  );

  it('should return null if no user exists with those args', async () => {
    // arrange
    const args: GerUserArgs = {id: 'idddddddddd', username: 'usernameeeee'};
    when(MockUserDelegate.findUnique(anything())).thenResolve(null);
    // act
    const result = await userDS.getUser(args);
    // assert
    expect(result).toBe(null);
  });

  it('should return a user if it exists', async () => {
    // arrange
    const args: GerUserArgs = {id: 'idddddddddd', username: 'usernameeeee'};
    when(MockUserDelegate.findUnique(anything())).thenResolve(mockPrismaUser);
    // act
    const result = await userDS.getUser(args);
    // assert
    expect(result).toStrictEqual(mockGraphQLUser);
  });
});

describe('isUsernameTaken', () => {
  const username = 'very_good_username';

  it('should return false if the username is not taken', async () => {
    // arrange
    when(MockUserDelegate.findUnique(anything())).thenResolve(null);
    // act
    const result = await userDS.isUsernameTaken(username);
    // assert
    verify(MockUserDelegate.findUnique(
      deepEqual({where: {username}}))
    ).once();
    expect(result).toBe(false);
  });

  it('should return true if the username is taken', async () => {
    // arrange
    when(MockUserDelegate.findUnique(anything())).thenResolve(mockPrismaUser);
    // act
    const result = await userDS.isUsernameTaken(username);
    // assert
    verify(MockUserDelegate.findUnique(
      deepEqual({where: {username}}))
    ).once();
    expect(result).toBe(true);
  });
});

describe('createUser', () => {
  it('should create and return the created user', async () => {
    // arrange
    when(MockUserDelegate.create(anything())).thenResolve(mockPrismaUser);
    // act
    const result = await userDS.createUser(mockCreateUserArgs);
    // assert
    verify(MockUserDelegate.create(
      deepEqual({
        data: {
          ...mockCreateUserArgs,
          photoURLSource: undefined,
          photoURLMedium: undefined,
          photoURLSmall: undefined,
        }
      }))
    ).once();
    expect(result).toStrictEqual(mockMe);
  });
});

describe('updateUser', () => {
  it('should update and return the updated user', async () => {
    // arrange
    const updates: UpdateUserArgs = {
      authUserID: 'userID',
      username: 'userName',
      deletePhoto: true,
    };
    when(MockUserDelegate.update(anything())).thenResolve(mockPrismaUser);
    // act
    const result = await userDS.updateUser(updates);
    // assert
    verify(MockUserDelegate.update(deepEqual({
      where: {authUserID: updates.authUserID},
      data: {
        username: updates.username,
        name: undefined,
        photoURLSource: null,
        photoURLMedium: null,
        photoURLSmall: null,
      },
    }))).once();
    expect(result).toStrictEqual(mockMe);
  });
});

describe('findUsers', () => {
  it('should find users with the search query, excluding the array of ids', async () => {
    // arrange
    when(MockUserDelegate.findMany(anything())).thenResolve([mockPrismaUser]);
    const searchQuery = 'searchQuery';
    const exclude = ['blabla', 'haha'];
    // act
    const result = await userDS.findUsers(searchQuery, exclude);
    // assert
    expect(result).toEqual([UserDataSource._getGraphQLUser(mockPrismaUser)]);
    verify(MockUserDelegate.findMany(deepEqual({
      where: {
        AND: [
          {authUserID: {notIn: exclude}},
          {
            OR: [
              {username: {contains: searchQuery, mode: 'insensitive'}},
              {name: {contains: searchQuery, mode: 'insensitive'}}
            ],
          }
        ]
      },
    }))).once();
  });
});

describe('updateActiveStatus', () => {
  it('should update the active status', async () => {
    // arrange
    const userID = 'userIIIIIIDDDDDD';
    const activeStatus = false;
    // act
    const result = await userDS.updateActiveStatus(userID, activeStatus);
    // assert
    verify(MockUserDelegate.update(deepEqual({
      where: {authUserID: userID},
      data: {activeStatus}
    }))).once();
    expect(result).toBe(activeStatus);
  });
});

describe('updateLastSeen', () => {
  it('should update last seen date', async () => {
    // arrange
    const userID = 'userIIIIIIDDDDDD';
    const lastSeen = mockDate;
    // act
    const result = await userDS.updateLastSeen(userID);
    // assert
    verify(MockUserDelegate.update(deepEqual({
      where: {authUserID: userID},
      data: {lastSeen}
    }))).once();
    expect(result).toBe(lastSeen);
  });
});

describe('_getGraphQLUser', () => {
  it('should return the corresponding gql user', () => {
    // act
    const result = UserDataSource._getGraphQLUser(mockPrismaUser);
    // assert
    expect(result).toStrictEqual(mockGraphQLUser);
  });
});
