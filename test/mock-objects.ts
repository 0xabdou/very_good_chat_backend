import {AuthUser, User} from '@prisma/client';
import {AuthProviderUser} from "../src/features/auth/data/google-api";
import {CreateUserArgs} from "../src/features/user/data/user-data-source";
import {User as GraphQLUser} from '../src/features/user/graphql/types';

export const mockPrismaAuthUser: AuthUser = {
  id: 'auth_user_id',
  email: 'auth@email.com',
};

export const mockPrismaUser: User = {
  username: 'username',
  name: null,
  photoURL: '/storage/auth_user_id_pp.png',
  authUserID: 'auth_user_id',
};

export const mockGraphQLUser: GraphQLUser = {
  id: mockPrismaUser.authUserID,
  username: mockPrismaUser.username,
  name: mockPrismaUser.name ?? undefined,
  photoURL: mockPrismaUser.photoURL ?? undefined,
};

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