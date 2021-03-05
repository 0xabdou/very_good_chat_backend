import 'reflect-metadata';
import express, {Request, Response} from 'express';

import {PrismaClient} from "@prisma/client";

import {ApolloServer, GetMiddlewareOptions} from "apollo-server-express";
import {buildSchema} from "type-graphql";
import {AuthResolver} from "./features/auth/graphql/resolver";
import axios from "axios";
import cors from 'cors';
import cookieParser from "cookie-parser";
import UserDataSource from "./features/user/data/user-data-source";
import {UserResolver} from "./features/user/graphql/resolver";
import {graphqlUploadExpress} from 'graphql-upload';
import errorInterceptor from "./middlewares/error-interceptor";
import authRouter from "./features/auth/rest/router";
import GoogleAPI from "./features/auth/data/google-api";
import AuthDataSource from "./features/auth/data/auth-data-source";
import {Tokens} from "./features/auth/data/tokens";
import signer from "./features/auth/data/signer";
import corsOptions from "./cors";


export type Context = {
  req: Request,
  res: Response,
  userID?: string,
  dataSources: {
    googleAPI: GoogleAPI,
    authDS: AuthDataSource,
    tokens: Tokens,
    userDS: UserDataSource,
  }
}

const bootstrap = async () => {
  const app = express();

  const CORS = cors(corsOptions);

  app.use(express.static('storage'));

  app.use(cookieParser(process.env.COOKIE_SECRET));

  const tokens = new Tokens(signer);
  app.use('/auth', CORS, authRouter(tokens));

  app.use(graphqlUploadExpress({maxFileSize: 10000000, maxFiles: 10}));

  const prisma = new PrismaClient();

  const schema = await buildSchema({
    resolvers: [AuthResolver, UserResolver],
    globalMiddlewares: [errorInterceptor],
  });

  const server = new ApolloServer({
    schema,
    uploads: false,
    context: ({req, res}): Context => {
      return {
        req,
        res,
        dataSources: {
          googleAPI: new GoogleAPI(axios),
          authDS: new AuthDataSource(prisma),
          tokens: new Tokens(signer),
          userDS: new UserDataSource(prisma),
        }
      };
    }
  });

  const apolloCorsOptions = corsOptions as GetMiddlewareOptions['cors'];
  server.applyMiddleware({app, cors: apolloCorsOptions});

  app.listen(4000, () => {
    console.log(`
    🚀 Server is up and running.
    🎉 Listening on port 4000.
  `);
  });
};

bootstrap();

