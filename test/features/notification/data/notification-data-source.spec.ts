import {
  AuthUser as PrismaAuthUser,
  Notification as PrismaNotification,
  NotificationType as PrismaNotificationType,
  Prisma,
  PrismaClient,
  User as PrismaUser
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
import NotificationDataSource
  from "../../../../src/features/notification/data/notification-data-source";
import {mockPrismaUser} from "../../../mock-objects";
import {
  Notification,
  NotificationType
} from "../../../../src/features/notification/graphql/types";
import UserDataSource
  from "../../../../src/features/user/data/user-data-source";

const MockPrismaClient = mock<PrismaClient>();
const MockNotificationDelegate = mock<Prisma.NotificationDelegate<any>>();
const userID = 'userIDDDDDD';

const notificationDS = new NotificationDataSource(instance(MockPrismaClient));

beforeAll(() => {
  when(MockPrismaClient.notification).thenReturn(instance(MockNotificationDelegate));
});

beforeEach(() => {
  reset(MockNotificationDelegate);
});

const prismaRANotification: PrismaNotification & ({
  friend: (PrismaAuthUser & ({
    user: PrismaUser | null
  })) | null
}) = {
  id: 0,
  ownerID: userID,
  date: new Date(),
  seen: false,
  type: PrismaNotificationType.REQUEST_ACCEPTED,
  friendID: 'id1',
  friend: {
    id: 'id1',
    email: 'email1',
    user: {
      ...mockPrismaUser,
      authUserID: 'id1',
      username: 'username1',
    }
  }
};
const GQLRAnotfication: Notification = {
  id: prismaRANotification.id,
  date: prismaRANotification.date,
  seen: prismaRANotification.seen,
  type: NotificationType[prismaRANotification.type],
  friend: UserDataSource._getGraphQLUser(prismaRANotification.friend?.user!),
};

describe('getNotifications', () => {
  it('should return notifications', async () => {
    // arrange

    when(MockNotificationDelegate.findMany(anything())).thenResolve([prismaRANotification]);
    // act
    const result = await notificationDS.getNotifications(userID);
    // assert
    expect(result[0]).toStrictEqual(GQLRAnotfication);
    verify(MockNotificationDelegate.findMany(deepEqual({
      where: {ownerID: userID},
      include: {friend: {include: {user: true}}}
    }))).once();
  });
});

describe('sendRequestAcceptedNotification', () => {
  it('should send a notification', async () => {
    // arrange
    when(MockNotificationDelegate.create(anything())).thenResolve(prismaRANotification);
    const receiverID = 'receivedID';
    // act
    await notificationDS.sendRequestAcceptedNotification(userID, receiverID);
    // assert
    verify(MockNotificationDelegate.create(deepEqual({
      data: {
        date: new Date(),
        type: NotificationType.REQUEST_ACCEPTED,
        ownerID: receiverID,
        friendID: userID,
      }
    }))).once();
  });
});