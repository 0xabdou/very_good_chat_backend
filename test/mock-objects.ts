import {AuthUser, User, Friend} from '@prisma/client';
import {AuthProviderUser} from "../src/features/auth/data/google-api";
import {CreateUserArgs} from "../src/features/user/data/user-data-source";
import {User as GraphQLUser} from '../src/features/user/graphql/types';
import {
  Friendship,
  FriendshipStatus
} from "../src/features/friend/graphql/types";
import {ResizedPhotos} from "../src/shared/utils/file-utils";

export const mockPrismaAuthUser: AuthUser = {
  id: 'auth_user_id',
  email: 'auth@email.com',
};

export const mockPrismaUser: User = {
  username: 'username',
  name: null,
  photoURLSource: '/storage/auth_user_id_pp_source.png',
  photoURLMedium: '/storage/auth_user_id_pp_medium.png',
  photoURLSmall: '/storage/auth_user_id_pp_small.png',
  authUserID: 'auth_user_id',
};

export const mockGraphQLUser: GraphQLUser = {
  id: mockPrismaUser.authUserID,
  username: mockPrismaUser.username,
  name: mockPrismaUser.name ?? undefined,
  photoURLSource: '/storage/auth_user_id_pp_source.png',
  photoURLMedium: '/storage/auth_user_id_pp_medium.png',
  photoURLSmall: '/storage/auth_user_id_pp_small.png',
};

export const mockResizedPhotos : ResizedPhotos = {
  source: 'source',
  medium: 'medium',
  small: 'small'
}

export const mockAuthProviderUser: AuthProviderUser = {
  email: 'provider@email.com',
  displayName: 'Provider User',
  photoURL: 'https://provider.com/photo.png',
};

export const mockCreateUserArgs: CreateUserArgs = {
  authUserID: 'authUserID',
  username: 'username',
  name: 'name',
};

export const mockFriend : Friend = {
  id: 0,
  user1ID: 'user1ID',
  user2ID: 'user2ID',
  confirmed: false,
  date: new Date()
}

export const mockFriendship : Friendship  = {
  status: FriendshipStatus.FRIENDS,
  date: new Date()
}