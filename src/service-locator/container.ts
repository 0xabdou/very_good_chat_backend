import {Container} from "inversify";
import TYPES from "./types";
import GoogleAPI from "../features/auth/data/google-api";
import {Tokens} from "../features/auth/data/tokens";
import signer, {Signer} from "../features/auth/data/signer";
import {PrismaClient} from "@prisma/client";
import AuthDataSource from "../features/auth/data/auth-data-source";
import {DataSources, ToolBox, Utils, Validators} from "../shared/context";
import axios, {AxiosStatic} from "axios";
import UserDataSource from "../features/user/data/user-data-source";
import userValidators from "../features/user/graphql/validators";
import FileUtils from "../shared/utils/file-utils";
import FriendDataSource from "../features/friend/data/friend-data-source";
import Uploader, {IUploader} from "../shared/apis/uploader";
import {Storage} from "@google-cloud/storage";

const container = new Container();

export const initContainer = async () => {
  // Prisma
  container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(new PrismaClient());
  // Axios
  container.bind<AxiosStatic>(TYPES.Axios).toConstantValue(axios);
  // Google API
  container.bind<GoogleAPI>(TYPES.GoogleAPI).to(GoogleAPI);
  // Google Storage API
  container.bind<Storage>(TYPES.Storage).toConstantValue(new Storage());
  // JWT tokens stuff
  container.bind<Signer>(TYPES.signer).toConstantValue(signer);
  container.bind<Tokens>(TYPES.Tokens).to(Tokens);
  // Auth data source
  container.bind<AuthDataSource>(TYPES.AuthDataSource).to(AuthDataSource);
  // User data source
  container.bind<UserDataSource>(TYPES.UserDataSource).to(UserDataSource);
  // Friend data source
  container.bind<FriendDataSource>(TYPES.FriendDataSource).to(FriendDataSource);
  // Shared APIS
  container.bind<IUploader>(TYPES.IUploader).to(Uploader);

  // Context data sources
  container.bind<DataSources>(TYPES.DataSources).toConstantValue({
    googleAPI: container.get(TYPES.GoogleAPI),
    uploader: container.get(TYPES.IUploader),
    tokens: container.get(TYPES.Tokens),
    authDS: container.get(TYPES.AuthDataSource),
    userDS: container.get(TYPES.UserDataSource),
    friendDS: container.get(TYPES.FriendDataSource),
  });

  // Context validators
  container.bind<Validators>(TYPES.Validators).toConstantValue({
    user: userValidators,
  });

  // utils
  container.bind<Utils>(TYPES.Utils).toConstantValue({
    file: new FileUtils(require.main?.path! + '/../storage'),
  });

  container.bind<ToolBox>(TYPES.ToolBox).toConstantValue({
    dataSources: container.get(TYPES.DataSources),
    validators: container.get(TYPES.Validators),
    utils: container.get(TYPES.Utils),
  });
};

export default container;