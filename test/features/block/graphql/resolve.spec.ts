import Context from "../../../../src/shared/context";
import {anything, instance, mock, reset, verify, when} from "ts-mockito";
import FriendDataSource
  from "../../../../src/features/friend/data/friend-data-source";
import BlockDataSource
  from "../../../../src/features/block/data/block-data-source";
import BlockResolver from "../../../../src/features/block/graphql/resolver";
import {FriendshipStatus} from "../../../../src/features/friend/graphql/types";
import {mockBlock, mockPrismaBlock} from "../../../mock-objects";
import {Block} from "../../../../src/features/block/graphql/types";

const MockFriendDS = mock<FriendDataSource>();
const MockBlockDS = mock<BlockDataSource>();
const {blockingID, blockedID} = mockPrismaBlock;

const context = {
  userID: blockingID,
  toolBox: {
    dataSources: {
      friendDS: instance(MockFriendDS),
      blockDS: instance(MockBlockDS)
    }
  }
} as Context;

const resolver = new BlockResolver();

beforeEach(() => {
  reset(MockFriendDS);
  reset(MockBlockDS);
});

describe('block', () => {
  it('should unfriend then block the user', async () => {
    // arrange
    when(MockFriendDS.unfriend(anything(), anything()))
      .thenResolve({status: FriendshipStatus.STRANGERS});
    when(MockBlockDS.block(anything(), anything())).thenResolve(mockBlock);
    // act
    const result = await resolver.block(context, blockedID);
    // assert
    expect(result).toStrictEqual(mockBlock);
    verify(MockFriendDS.unfriend(blockingID, blockedID)).once();
    verify(MockBlockDS.block(blockingID, blockedID)).once();
  });
});

describe('unblock', () => {
  it('should unblock the user (should forward the call to blockDS.unblock)', () => {
    // arrange
    const promise = new Promise<string>(r => r(blockedID));
    when(MockBlockDS.unblock(anything(), anything())).thenReturn(promise);
    // act
    const result = resolver.unblock(context, blockedID);
    // assert
    expect(result).toBe(promise);
    verify(MockBlockDS.unblock(blockingID, blockedID)).once();
  });
});

describe('getBlockedUsers', () => {
  it('should return the blocked users (should forward the call to blockDS)', () => {
    // arrange
    const promise = new Promise<Block[]>(r => r([mockBlock]));
    when(MockBlockDS.getBlockedUsers(anything())).thenReturn(promise);
    // act
    const result = resolver.getBlockedUsers(context);
    // assert
    expect(result).toBe(promise);
    verify(MockBlockDS.getBlockedUsers(blockingID)).once();
  });
});