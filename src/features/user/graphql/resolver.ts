import {Arg, Ctx, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import {User, UserCreation} from "./types";
import {ApolloError, UserInputError} from "apollo-server-express";

import isAuthenticated from "../../auth/graphql/is-authenticated";
import Context from "../../../shared/context";
import {
  returnsBoolean,
  returnsUser
} from "../../../shared/graphql/return-types";

@Resolver()
export class UserResolver {
  @Query(returnsUser)
  @UseMiddleware(isAuthenticated)
  async me(@Ctx() context: Context): Promise<User> {
    const user = await context.toolBox
      .dataSources.userDS.getUser(context.userID!);
    if (!user) throw new ApolloError("This user has to register", "USER_NOT_FOUND");
    return {
      ...user,
      photoURL: this._completePhotoUrl(user.photoURL, context),
    };
  }

  @Mutation(returnsUser)
  @UseMiddleware(isAuthenticated)
  async register(
    @Ctx() context: Context,
    @Arg('input') creation: UserCreation
  ) {
    const validator = context.toolBox.validators.user;
    const usernameError = validator.validateUsername(creation.username);
    const nameError = validator.validateName(creation.name ?? '');
    if (usernameError || nameError) {
      const errors: any = {};
      if (usernameError) errors.username = usernameError;
      if (nameError) errors.name = nameError;
      throw new UserInputError('Invalid input', errors);
    }

    const usernameTaken = await context.toolBox
      .dataSources.userDS.isUsernameTaken(creation.username);
    if (usernameTaken)
      throw new ApolloError('Username taken', 'USERNAME_TAKEN');

    let photoPath: string | undefined;
    if (creation.photo) {
      try {
        photoPath = await context.toolBox.utils.file.saveProfilePhoto({
          userID: context.userID!,
          photo: creation.photo
        });
      } catch (e) {
        throw new ApolloError(
          "Couldn't save the photo",
          "INTERNAL_SERVER_ERROR"
        );
      }
    }
    const user = await context.toolBox.dataSources.userDS.createUser({
      authUserID: context.userID!,
      username: creation.username,
      name: creation.name ?? undefined,
      photoURL: photoPath,
    });
    return {
      ...user,
      photoURL: this._completePhotoUrl(user.photoURL, context)
    };
  }

  @Query(returnsBoolean)
  @UseMiddleware(isAuthenticated)
  checkUsernameExistence(
    @Ctx() context: Context,
    @Arg('username') username: string
  ): Promise<boolean> {
    return context.toolBox.dataSources.userDS.isUsernameTaken(username);
  }

  _completePhotoUrl(
    photoURL: string | undefined, context: Context): string | undefined {
    if (photoURL) {
      const req = context.req;
      const PORT = process.env.PORT ?? 4000;
      const port = (PORT == '80' || PORT == '443') ? '' : `:${PORT}`;
      return `${req.protocol}://${req.hostname}${port}/${photoURL}`;
    }
  }
}