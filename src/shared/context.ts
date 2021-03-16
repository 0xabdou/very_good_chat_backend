import {Request, Response} from "express";
import GoogleAPI from "../features/auth/data/google-api";
import AuthDataSource from "../features/auth/data/auth-data-source";
import {Tokens} from "../features/auth/data/tokens";
import UserDataSource from "../features/user/data/user-data-source";
import {UserValidators} from "../features/user/graphql/validators";
import FileUtils from "./utils/file-utils";
import FriendDataSource from "../features/friend/data/friend-data-source";

type Context = {
  req: Request,
  res: Response,
  userID?: string,
  toolBox: ToolBox,
}
export type ToolBox = {
  dataSources: DataSources,
  validators: Validators,
  utils: Utils,
}

export type DataSources = {
  googleAPI: GoogleAPI,
  tokens: Tokens,
  userDS: UserDataSource,
  authDS: AuthDataSource,
  friendDS: FriendDataSource,
}

export type Validators = {
  user: UserValidators,
}

export type Utils = {
  file: FileUtils,
}

export default Context;
