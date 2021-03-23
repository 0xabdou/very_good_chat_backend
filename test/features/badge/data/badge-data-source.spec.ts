import {Badge as PrismaBadge, Prisma, PrismaClient} from '@prisma/client';

import {
  anything,
  deepEqual,
  instance,
  mock,
  resetCalls,
  verify,
  when
} from "ts-mockito";
import {Badge, BadgeName} from "../../../../src/features/badge/graphql/types";
import BadgeDataSource
  from "../../../../src/features/badge/data/badge-data-source";
import {mockPrismaBadges} from "../../../mock-objects";

const MockPrismaClient = mock<PrismaClient>();
const MockBadgeDelegate = mock<Prisma.BadgeDelegate<any>>();
const userID = 'userIDDDDDD';
const date = new Date();
let spy: jest.SpyInstance;

const badgeDS = new BadgeDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.badge).thenReturn(instance(MockBadgeDelegate));
  spy = jest
    .spyOn(global, 'Date')
    .mockImplementation(() => date as unknown as string);
});

afterAll(() => {
  spy.mockRestore();
});

beforeEach(() => {
  resetCalls(MockBadgeDelegate);
});

describe('_getBadge', () => {
  const basePrismaBadge: PrismaBadge = {
    userID: 'userID',
    badgeName: BadgeName.NOTIFICATIONS,
    lastOpened: new Date()
  };

  it('should return the right object for NOTIFICATIONS', function () {
    const input: PrismaBadge = {...basePrismaBadge};
    const expectedOutput: Badge = {
      badgeName: BadgeName[input.badgeName],
      lastOpened: input.lastOpened
    };
    const output = BadgeDataSource._getBadge(input);
    expect(output).toStrictEqual(expectedOutput);
  });

  it('should return the right object for FRIEND_REQUESTS', function () {
    const input: PrismaBadge = {
      ...basePrismaBadge,
      badgeName: BadgeName.FRIEND_REQUESTS
    };
    const expectedOutput: Badge = {
      badgeName: BadgeName[input.badgeName],
      lastOpened: input.lastOpened
    };
    const output = BadgeDataSource._getBadge(input);
    expect(output).toStrictEqual(expectedOutput);
  });
});

describe('getUserBadges', () => {
  const act = () => badgeDS.getUserBadges(userID);
  const expected = mockPrismaBadges.map(b => BadgeDataSource._getBadge(b));

  it('should return badges without creating them if they exist', async () => {
    // arrange
    when(MockBadgeDelegate.findMany(anything())).thenResolve(mockPrismaBadges);
    // act
    const result = await act();
    // assert
    expect(result).toStrictEqual(expected);
    verify(MockBadgeDelegate.findMany(deepEqual({where: {userID}}))).once();
    verify(MockBadgeDelegate.create(anything())).never();
  });

  it("should create the badges if they don't exist, then return them", async () => {
    // arrange
    let i = 0;
    const call = () => expected[i++];
    when(MockBadgeDelegate.findMany(anything())).thenResolve([]);
    when(MockBadgeDelegate.create(anything())).thenCall(call);
    // act
    const result = await act();
    // assert
    expect(result).toStrictEqual(expected);
    verify(MockBadgeDelegate.findMany(deepEqual({where: {userID}}))).once();
    Object.values(BadgeName).forEach(badgeName => {
      verify(MockBadgeDelegate.create(deepEqual(
        {data: {userID, badgeName, lastOpened: date}}
      ))).once();
    });
  });
});

describe('updateBadge', () => {
  it('should update the badge', async () => {
    // arrange
    const prismaBadge = mockPrismaBadges[0];
    const badgeName = BadgeName[prismaBadge.badgeName];
    const expected = BadgeDataSource._getBadge(prismaBadge);
    when(MockBadgeDelegate.upsert(anything())).thenResolve(prismaBadge);
    // act
    const result = await badgeDS.updateBadge(userID, badgeName);
    // assert
    expect(result).toStrictEqual(expected);
    verify(MockBadgeDelegate.upsert(deepEqual({
      where: {userID_badgeName: {userID, badgeName}},
      update: {lastOpened: date},
      create: {userID, badgeName, lastOpened: date}
    }))).once();
  });
});