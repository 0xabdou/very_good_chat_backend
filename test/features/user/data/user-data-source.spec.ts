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
import UserDataSource
  from "../../../../src/features/user/data/user-data-source";
import {
  mockCreateUserArgs,
  mockGraphQLUser,
  mockPrismaUser
} from "../../../mock-objects";

const MockPrismaClient = mock<PrismaClient>();
const MockUserDelegate = mock<Prisma.UserDelegate<any>>();

const userDS = new UserDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.user).thenReturn(instance(MockUserDelegate));
});

beforeEach(() => {
  resetCalls(MockUserDelegate);
});

describe('getUser', () => {
  const userID = 'userID';
  it('should return null if no user exists with that id', async () => {
    // arrange
    when(MockUserDelegate.findUnique(anything())).thenResolve(null);
    // act
    const result = await userDS.getUser(userID);
    // assert
    verify(MockUserDelegate.findUnique(
      deepEqual({where: {authUserID: userID}}))
    ).once();
    expect(result).toBe(null);
  });

  it('should return a user if it exists', async () => {
    // arrange
    when(MockUserDelegate.findUnique(anything())).thenResolve(mockPrismaUser);
    // act
    const result = await userDS.getUser(userID);
    // assert
    verify(MockUserDelegate.findUnique(
      deepEqual({where: {authUserID: userID}}))
    ).once();
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
      deepEqual({data: mockCreateUserArgs}))
    ).once();
    expect(result).toStrictEqual(mockGraphQLUser);
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
