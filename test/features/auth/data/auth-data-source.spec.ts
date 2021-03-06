import {
  anything,
  deepEqual,
  instance,
  mock,
  reset,
  verify,
  when
} from "ts-mockito";
import {Prisma, PrismaClient} from "@prisma/client";
import AuthDataSource
  from "../../../../src/features/auth/data/auth-data-source";
import {mockPrismaAuthUser} from "../../../mock-objects";

const MockPrismaClient = mock<PrismaClient>();
const MockAuthUserDelegate = mock<Prisma.AuthUserDelegate<any>>();
const authDS = new AuthDataSource(instance(MockPrismaClient));
const email = mockPrismaAuthUser.email;

beforeAll(() => {
  when(MockPrismaClient.authUser).thenReturn(instance(MockAuthUserDelegate));
});

beforeEach(() => {
  reset(MockAuthUserDelegate);
});

describe('findOrCreateAuthUser', () => {
  it('should return the auth user if it exists', async () => {
    // arrange
    when(MockAuthUserDelegate.findUnique(anything()))
      .thenResolve(mockPrismaAuthUser);
    // act
    const result = await authDS.findOrCreateAuthUser(email);
    // assert
    verify(MockAuthUserDelegate.findUnique(deepEqual({where: {email}}))).once();
    verify(MockAuthUserDelegate.create(deepEqual({data: {email}}))).never();
    expect(result).toStrictEqual(mockPrismaAuthUser);
  });

  it("should create then return the auth user if it doesn't exist",
    async () => {
      // arrange
      when(MockAuthUserDelegate.findUnique(anything()))
        .thenResolve(null);
      when(MockAuthUserDelegate.create(anything())).
      thenResolve(mockPrismaAuthUser);
      // act
      const result = await authDS.findOrCreateAuthUser(email);
      // assert
      verify(MockAuthUserDelegate.create(deepEqual({data: {email}}))).once();
      expect(result).toStrictEqual(mockPrismaAuthUser);
    }
  );
});