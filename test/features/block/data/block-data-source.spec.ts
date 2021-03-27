import {
  AuthUser as PrismaAuthUser,
  Block as PrismaBlock,
  Prisma,
  PrismaClient,
  User as PrismaUser,
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
import BlockDataSource
  from "../../../../src/features/block/data/block-data-source";
import {mockPrismaAuthUser, mockPrismaUser} from "../../../mock-objects";
import {Block} from "../../../../src/features/block/graphql/types";
import UserDataSource
  from "../../../../src/features/user/data/user-data-source";

const MockPrismaClient = mock<PrismaClient>();
const MockBlockDelegate = mock<Prisma.BlockDelegate<any>>();
const blockingID = 'blockinggggggg';
const blockedID = 'blockeddddddd';

const blockDS = new BlockDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.block).thenReturn(instance(MockBlockDelegate));
});

beforeEach(() => {
  reset(MockBlockDelegate);
});

type PrismaBlockWithUser = PrismaBlock & ({
  blocked: PrismaAuthUser & { user: PrismaUser }
});

const mockPrismaBlock: PrismaBlockWithUser = {
  id: 1231,
  blockedID,
  blockingID,
  blocked: {
    ...mockPrismaAuthUser,
    user: mockPrismaUser
  },
  date: new Date(),
};

const mockBlock: Block = {
  user: UserDataSource._getGraphQLUser(mockPrismaBlock.blocked.user),
  date: mockPrismaBlock.date
};

describe('block', () => {
  it('should block the user and return the block object', async () => {
    // arrange
    when(MockBlockDelegate.create(anything())).thenResolve(mockPrismaBlock);
    // act
    const result = await blockDS.block(blockingID, blockedID);
    // assert
    expect(result).toStrictEqual(mockBlock);
    verify(MockBlockDelegate.create(deepEqual({
      data: {blockingID, blockedID},
      include: {
        blocked: {
          include: {user: true}
        }
      }
    }))).once();
  });
});

describe('unblock', () => {
  it('should unblock the user and return the block object', async () => {
    // arrange
    when(MockBlockDelegate.delete(anything())).thenResolve(mockPrismaBlock);
    // act
    const result = await blockDS.unblock(blockingID, blockedID);
    // assert
    expect(result).toStrictEqual(mockPrismaBlock.id);
    verify(MockBlockDelegate.delete(deepEqual({
      where: {blockingID_blockedID: {blockedID, blockingID}}
    }))).once();
  });
});

describe('getBlockedUsers', () => {
  it('should return the blocked users', async () => {
    // arrange
    when(MockBlockDelegate.findMany(anything())).thenResolve([mockPrismaBlock]);
    // act
    const result = await blockDS.getBlockedUsers(blockingID);
    // assert
    expect(result).toStrictEqual([mockBlock]);
    verify(MockBlockDelegate.findMany(deepEqual({
      where: {blockingID},
      include: {blocked: {include: {user: true}}}
    }))).once();
  });
});