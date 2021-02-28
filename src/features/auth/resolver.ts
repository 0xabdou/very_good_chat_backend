import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver
} from "type-graphql";
import {Context} from "../../index";
import {LoginResponse} from "./types";

@InputType()
class LoginInput {
  @Field()
  token!: String;
}

@Resolver()
export class AuthResolver {
  @Query()
  hello(): String {
    return 'World!';
  }

  @Mutation(returns => LoginResponse)
  async loginWithGoogle(
    @Arg('input') loginInput: LoginInput,
    @Ctx() context: Context
  ): Promise<LoginResponse> {
    const authProviderUser = await context
      .dataSources.googleAPI.getGoogleUser(loginInput.token.toString());
    const authUser = await context
      .dataSources.authStore.findOrCreateAuthUser(authProviderUser.email);
    return {
      accessToken: 'SOME WEIRD ACCESS TOKEN',
      displayName: authProviderUser.displayName,
      photoUrl: authProviderUser.photoURL,
    };

  }
}

