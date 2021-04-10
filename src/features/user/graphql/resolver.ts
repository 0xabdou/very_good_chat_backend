import {Arg, Ctx, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import {Me, User, UserCreation, UserUpdate} from "./types";
import {ApolloError, UserInputError} from "apollo-server-express";

import isAuthenticated from "../../auth/graphql/is-authenticated";
import Context from "../../../shared/context";
import {
  returnsBoolean,
  returnsListOfUsers,
} from "../../../shared/graphql/return-types";
import {FileUpload} from "graphql-upload";
import {ResizedPhotos} from "../../../shared/utils/file-utils";

@Resolver()
export class UserResolver {

  @Query(() => Me)
  @UseMiddleware(isAuthenticated)
  async me(@Ctx() context: Context): Promise<Me> {
    const me = await context.toolBox.dataSources.userDS.getMe(context.userID!);
    if (!me) throw new ApolloError("This user has to register", "USER_NOT_FOUND");
    return me;
  }

  @Mutation(() => Me)
  @UseMiddleware(isAuthenticated)
  async register(
    @Ctx() context: Context,
    @Arg('input') creation: UserCreation
  ): Promise<Me> {
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

    let urls: ResizedPhotos | undefined;
    if (creation.photo) {
      urls = await this._savePhoto(context, creation.photo);
    }
    return context.toolBox.dataSources.userDS.createUser({
      authUserID: context.userID!,
      username: creation.username,
      name: creation.name ?? undefined,
      photo: urls,
    });
  }

  @Mutation(() => Me)
  @UseMiddleware(isAuthenticated)
  async updateUser(@Ctx() context: Context, @Arg('input') update: UserUpdate): Promise<Me> {
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
    let urls: ResizedPhotos | undefined;
    if (!update.deletePhoto && update.photo) {
      urls = await this._savePhoto(context, update.photo);
    }
    return context.toolBox.dataSources.userDS.updateUser({
      authUserID: context.userID!,
      username: update.username,
      name: update.name,
      deleteName: !!update.deleteName,
      photo: urls,
      deletePhoto: !!update.deletePhoto,
    });
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  updateActiveStatus(
    @Ctx() context: Context,
    @Arg('activeStatus') activeStatus: boolean
  ): Promise<boolean> {
    return context.toolBox.dataSources.userDS.updateActiveStatus(
      context.userID!, activeStatus
    );
  }

  @Mutation(() => Date)
  @UseMiddleware(isAuthenticated)
  updateLastSeen(@Ctx() context: Context): Promise<Date> {
    return context.toolBox.dataSources.userDS.updateLastSeen(context.userID!);
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
  ): Promise<User[]> {
    const blockingIDs = await context.toolBox.dataSources.blockDS.getBlockingUserIDs(context.userID!);
    return context.toolBox.dataSources.userDS.findUsers(searchQuery, blockingIDs);
  }

  async _savePhoto(context: Context, photo: Promise<FileUpload>):
    Promise<ResizedPhotos> {
    try {
      const fileUtils = context.toolBox.utils.file;
      const userID = context.userID!;
      return await fileUtils.saveAvatar(photo, userID);
    } catch (e) {
      console.log(e);
      throw new ApolloError(
        "Couldn't save the photo",
        "INTERNAL_SERVER_ERROR"
      );
    }
  }
}