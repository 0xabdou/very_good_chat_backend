import {Container} from "inversify";
import TYPES from "./types";
import GoogleAPI from "../features/auth/data/google-api";
import {Tokens} from "../features/auth/data/tokens";
import signer, {Signer} from "../features/auth/data/signer";
import {PrismaClient} from "@prisma/client";
import AuthDataSource from "../features/auth/data/auth-data-source";
import {ContextDataSources} from "../context";
import axios, {AxiosStatic} from "axios";
import UserDataSource from "../features/user/data/user-data-source";

const container = new Container();

export const initContainer = async () => {
  // Prisma
  container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(new PrismaClient());
  // Axios
  container.bind<AxiosStatic>(TYPES.Axios).toConstantValue(axios);
  // Google API
  container.bind<GoogleAPI>(TYPES.GoogleAPI).to(GoogleAPI);
  // JWT tokens stuff
  container.bind<Signer>(TYPES.signer).toConstantValue(signer);
  container.bind<Tokens>(TYPES.Tokens).to(Tokens);
  // Auth data source
  container.bind<AuthDataSource>(TYPES.AuthDataSource).to(AuthDataSource);
  // User data source
  container.bind<UserDataSource>(TYPES.UserDataSource).to(UserDataSource);

  container.bind<ContextDataSources>(TYPES.ContextDataSources).toConstantValue({
    googleAPI: container.get(TYPES.GoogleAPI),
    authDS: container.get(TYPES.AuthDataSource),
    tokens: container.get(TYPES.Tokens),
    userDS: container.get(TYPES.UserDataSource)
  });
};

export default container;