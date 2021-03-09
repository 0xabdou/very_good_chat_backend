import {Request, Response} from "express";
import GoogleAPI from "../features/auth/data/google-api";
import AuthDataSource from "../features/auth/data/auth-data-source";
import {Tokens} from "../features/auth/data/tokens";
import UserDataSource from "../features/user/data/user-data-source";
import {UserValidators} from "../features/user/graphql/validators";
import FileUtils from "./utils/file-utils";

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
  authDS: AuthDataSource,
  tokens: Tokens,
  userDS: UserDataSource,
}

export type Validators = {
  user: UserValidators,
}

export type Utils = {
  file: FileUtils,
}

export default Context;
