import {Block as PrismaBlock, Prisma, PrismaClient,} from '@prisma/client';
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
import {mockBlock, mockPrismaBlock} from "../../../mock-objects";

const MockPrismaClient = mock<PrismaClient>();
const MockBlockDelegate = mock<Prisma.BlockDelegate<any>>();
const {blockingID, blockedID} = mockPrismaBlock;

const blockDS = new BlockDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.block).thenReturn(instance(MockBlockDelegate));
});

beforeEach(() => {
  reset(MockBlockDelegate);
});


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
    expect(result).toStrictEqual(blockedID);
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
      include: {blocked: {include: {user: true}}},
      orderBy: {date: 'desc'},
    }))).once();
  });
});

describe('getBlockStatus', () => {
  const user1ID = 'user1ID', user2ID = 'user2ID';

  it('should return "blocking" if user1 is blocking user2', async () => {
    // arrange
    const block: PrismaBlock = {
      id: 0,
      blockingID: user1ID,
      blockedID: user2ID,
      date: new Date()
    };
    when(MockBlockDelegate.findMany(anything())).thenResolve([block]);
    // act
    const result = await blockDS.getBlockStatus(user1ID, user2ID);
    // assert
    expect(result).toBe('blocking');
    verify(MockBlockDelegate.findMany(deepEqual({
      where: {
        OR: [
          {blockingID: user1ID, blockedID: user2ID},
          {blockingID: user2ID, blockedID: user1ID}
        ]
      }
    }))).once();
  });

  it('should return "blocked" if user1 is blocked by user2', async () => {
    // arrange
    const block: PrismaBlock = {
      id: 0,
      blockingID: user2ID,
      blockedID: user1ID,
      date: new Date()
    };
    when(MockBlockDelegate.findMany(anything())).thenResolve([block]);
    // act
    const result = await blockDS.getBlockStatus(user1ID, user2ID);
    // assert
    expect(result).toBe('blocked');
  });

  it('should return undefined no one is blocking anyone', async () => {
    // arrange
    when(MockBlockDelegate.findMany(anything())).thenResolve([]);
    // act
    const result = await blockDS.getBlockStatus(user1ID, user2ID);
    // assert
    expect(result).toBeUndefined();
  });
});