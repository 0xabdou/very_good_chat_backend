import {Arg, Ctx, Mutation, Resolver,} from "type-graphql";
import {ApolloError} from 'apollo-server-express';

import {LoginInput, LoginResponse} from "./types";
import Context from "../../../shared/context";
import axios from "axios";
import {returnsLoginResponse} from "../../../shared/graphql/return-types";

@Resolver()
export class AuthResolver {

  @Mutation(returnsLoginResponse)
  async loginWithGoogle(
    @Arg('input') loginInput: LoginInput,
    @Ctx() context: Context
  ): Promise<LoginResponse> {
    try {
      const authProviderUser = await context.toolBox
        .dataSources.googleAPI.getGoogleUser(loginInput.token.toString());
      const authUser = await context.toolBox
        .dataSources.authDS.findOrCreateAuthUser(authProviderUser.email);
      const accessToken = context.toolBox
        .dataSources.tokens.generateAccessToken(authUser.id);
      const refreshToken = context.toolBox.dataSources.tokens.generateRefreshToken(authUser.id);
      context.res.cookie(
        'veryGoodCookie',
        refreshToken,
        {
          path: '/auth',
          httpOnly: true,
          secure: process.env.NODE_ENV == "prod",
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
      if (axios.isAxiosError(e) && e.response) {
        console.log('AuthResolver THREW: ', e.response.data);
        throw new ApolloError("Invalid google id token", 'INVALID_TOKEN');
      }
      console.log(e);
      throw new ApolloError(
        "Something wrong happened",
        'INTERNAL_SERVER_ERROR'
      );
    }
  }
}

