import {Request, Response} from "express";
import GoogleAPI from "../features/auth/data/google-api";
import AuthDataSource from "../features/auth/data/auth-data-source";
import {Tokens} from "../features/auth/data/tokens";
import UserDataSource from "../features/user/data/user-data-source";

type Context = {
  req: Request,
  res: Response,
  userID?: string,
  dataSources: ContextDataSources,
}

export type ContextDataSources = {
  googleAPI: GoogleAPI,
  authDS: AuthDataSource,
  tokens: Tokens,
  userDS: UserDataSource,
}
export default Context;
