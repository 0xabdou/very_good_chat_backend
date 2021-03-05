import {Arg, Ctx, Mutation, Resolver,} from "type-graphql";
import {AuthenticationError} from 'apollo-server-express';

import {LoginInput, LoginResponse} from "./types";
import Context from "../../../context";

@Resolver()
export class AuthResolver {

  @Mutation(_returns => LoginResponse)
  async loginWithGoogle(
    @Arg('input') loginInput: LoginInput,
    @Ctx() context: Context
  ): Promise<LoginResponse> {
    try {
      const authProviderUser = await context
        .dataSources.googleAPI.getGoogleUser(loginInput.token.toString());
      const authUser = await context
        .dataSources.authDS.findOrCreateAuthUser(authProviderUser.email);
      const accessToken =
        context.dataSources.tokens.generateAccessToken(authUser.id);
      const refreshToken =
        context.dataSources.tokens.generateRefreshToken(authUser.id);
      context.res.cookie(
        'veryGoodCookie',
        refreshToken,
        {
          path: '/auth',
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
        }
      );
      return {
        accessToken,
        authUser: {
          displayName: authProviderUser.displayName,
          photoUrl: authProviderUser.photoURL,
        },
      };
    } catch (e) {
      console.log(e);
      throw new AuthenticationError("Couldn't authenticate with google");
    }
  }
}

