import Context from "../../../../src/shared/context";
import {anything, instance, mock, verify, when} from "ts-mockito";
import BadgeDataSource
  from "../../../../src/features/badge/data/badge-data-source";
import {mockPrismaBadges} from "../../../mock-objects";
import {Badge, BadgeName} from "../../../../src/features/badge/graphql/types";
import BadgeResolver from "../../../../src/features/badge/graphql/resolver";

const MockBadgeDataSource = mock<BadgeDataSource>();
const userID = 'userID';
const context = {
  userID,
  toolBox: {dataSources: {badgeDS: instance(MockBadgeDataSource)}}
} as Context;

const resolver = new BadgeResolver();

describe('getBadges', () => {
  it('should forward the call to badgeDS.getBadges', () => {
    // arrange
    const badges = mockPrismaBadges.map(BadgeDataSource._getBadge);
    const promise: Promise<Badge[]> = new Promise(r => r(badges));
    when(MockBadgeDataSource.getUserBadges(anything())).thenReturn(promise);
    // act
    const result = resolver.getBadges(context);
    // assert
    expect(result).toBe(promise);
    verify(MockBadgeDataSource.getUserBadges(userID)).once();
  });
});

describe('updateBadge', () => {
  it('should forward the call to badgeDS.updateBadge', () => {
    // arrange
    const badge = mockPrismaBadges.map(BadgeDataSource._getBadge)[0];
    const badgeName = BadgeName.FRIEND_REQUESTS;
    const promise: Promise<Badge> = new Promise(r => r(badge));
    when(MockBadgeDataSource.updateBadge(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.updateBadge(context, badgeName);
    // assert
    expect(result).toBe(promise);
    verify(MockBadgeDataSource.updateBadge(userID, badgeName)).once();
  });
});