import {AuthUser} from '@prisma/client';
import {AuthProviderUser} from "../src/features/auth/data/google-api";

export const mockPrismaAuthUser : AuthUser = {
  id: 'auth_user_id',
  email: 'auth@email.com',
}

export const mockAuthProviderUser: AuthProviderUser = {
  email: 'provider@email.com',
  displayName: 'Provider User',
  photoURL: 'https://provider.com/photo.png',
}