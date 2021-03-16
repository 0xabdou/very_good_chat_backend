import {Arg, Ctx, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import {User, UserCreation, UserUpdate} from "./types";
import {ApolloError, UserInputError} from "apollo-server-express";

import isAuthenticated from "../../auth/graphql/is-authenticated";
import Context from "../../../shared/context";
import {
  returnsBoolean, returnsListOfUsers,
  returnsUser
} from "../../../shared/graphql/return-types";
import {FileUpload} from "graphql-upload";

@Resolver()
export class UserResolver {
  @Query(returnsUser)
  @UseMiddleware(isAuthenticated)
  async me(@Ctx() context: Context): Promise<User> {
    const user = await context.toolBox
      .dataSources.userDS.getUser({id: context.userID!});
    if (!user) throw new ApolloError("This user has to register", "USER_NOT_FOUND");
    return {
      ...user,
      name: user.name,
      photoURL: this._completePhotoUrl(user.photoURL, context),
    };
  }

  @Mutation(returnsUser)
  @UseMiddleware(isAuthenticated)
  async register(
    @Ctx() context: Context,
    @Arg('input') creation: UserCreation
  ): Promise<User> {
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
      photoPath = await this._savePhoto(context, creation.photo);
    }
    const user = await context.toolBox.dataSources.userDS.createUser({
      authUserID: context.userID!,
      username: creation.username,
      name: creation.name ?? undefined,
      photoURL: photoPath,
    });
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      photoURL: this._completePhotoUrl(user.photoURL, context)
    };
  }

  @Mutation(returnsUser)
  @UseMiddleware(isAuthenticated)
  async updateUser(@Ctx() context: Context, @Arg('input') update: UserUpdate) {
    const validator = context.toolBox.validators.user;
    const errors: any = {};
    if (update.username) {
      errors.username = validator.validateUsername(update.username);
      if (!errors.username) {
        const taken = await context.toolBox.dataSources.userDS
          .isUsernameTaken(update.username);
        if (taken) throw new ApolloError('Username taken', 'USERNAME_TAKEN');
      }
    }
    if (!update.deleteName && update.name)
      errors.name = validator.validateName(update.name);
    if (errors.username || errors.name) {
      throw new UserInputError('Invalid input', errors);
    }
    let photoURL: string | undefined;
    if (!update.deletePhoto && update.photo) {
      photoURL = await this._savePhoto(context, update.photo);
    }
    const user = await context.toolBox.dataSources.userDS.updateUser({
      authUserID: context.userID!,
      username: update.username,
      name: update.name,
      deleteName: !!update.deleteName,
      photoURL,
      deletePhoto: !!update.deletePhoto,
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

  @Query(returnsListOfUsers)
  @UseMiddleware(isAuthenticated)
  async findUsers(
    @Ctx() context: Context,
    @Arg('searchQuery') searchQuery: string
  ) : Promise<User[]> {
    const users = await context.toolBox.dataSources.userDS.findUsers(searchQuery);
    return users.map(u => {
      return {
        ...u,
        photoURL: this._completePhotoUrl(u.photoURL, context)};
    });
  }

  async _savePhoto(context: Context, photo: Promise<FileUpload>) {
    try {
      return await context.toolBox.utils.file.saveProfilePhoto({
        userID: context.userID!,
        photo,
      });
    } catch (e) {
      throw new ApolloError(
        "Couldn't save the photo",
        "INTERNAL_SERVER_ERROR"
      );
    }
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