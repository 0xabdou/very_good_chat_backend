import 'reflect-metadata';
import express, {Request, Response} from 'express';

import {PrismaClient} from "@prisma/client";

import {ApolloServer} from "apollo-server-express";
import {buildSchema, MiddlewareFn} from "type-graphql";
import {AuthResolver} from "./features/auth/resolver";
import {AuthStore, GoogleAPI, signer, Tokens} from "./features/auth/data";
import axios from "axios";
import cors, {CorsOptions} from 'cors';
import cookieParser from "cookie-parser";
import {UserStore} from "./features/user/data";
import {UserResolver} from "./features/user/resolver";
import {graphqlUploadExpress} from 'graphql-upload';


export type Context = {
  req: Request,
  res: Response,
  userID?: string,
  dataSources: {
    googleAPI: GoogleAPI,
    authStore: AuthStore,
    tokens: Tokens,
    userStore: UserStore,
  }
}

const errorInterceptor: MiddlewareFn<any> = async (_, next) => {
  try {
    return await next();
  } catch (e) {
    console.log(e.message);
    throw e;
  }
};

const bootstrap = async () => {
  const app = express();

  const whitelist = [
    "http://localhost:3000",
    'https://studio.apollographql.com',
  ];

  //app.use(
  //  cors({
  //    origin: (origin, callback) => {
  //      // To be able to download schema in client project using intellij plugin
  //      if (!origin) callback(null, true);
  //      if (origin && whitelist.indexOf(origin) !== -1) {
  //        callback(null, true);
  //      } else {
  //        callback(new Error('Not allowed by CORS'));
  //      }
  //    },
  //    credentials: true
  //  })
  //);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // To be able to download schema in client project using intellij plugin
      if (!origin) callback(null, true);
      if (origin && whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  };

  const CORS = cors(corsOptions);

  app.use(cookieParser('WOW_SUCH_SECRET'));

  app.use('/auth/refresh_token', CORS, async (req, res) => {
    console.log(req.cookies);
    const token = req.cookies.veryGoodCookie;
    if (!token)
      return res.status(401).json({error: 'UNAUTHENTICATED'});
    const tokens = new Tokens(signer);
    try {
      const userID = tokens.verifyToken(token);
      const accessToken = new Tokens(signer).generateAccessToken(userID);
      return res.json({accessToken});
    } catch (e) {
      console.log(e);
      return res.status(401).json({error: 'UNAUTHENTICATED'});
    }
  });

  app.use('/auth/logout', CORS, async (req, res) => {
    console.log(req.cookies);
    res.clearCookie('veryGoodCookie', {path: '/auth'});
    res.send({data: 'success'});
  });

  app.use(express.static('storage', {
    //setHeaders: res => {
    //  res.header
    //}
  }));

  app.use(graphqlUploadExpress({maxFileSize: 10000000, maxFiles: 10}));

  const prisma = new PrismaClient();

  const schema = await buildSchema({
    resolvers: [AuthResolver, UserResolver],
    globalMiddlewares: [errorInterceptor]
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
          authStore: new AuthStore(prisma),
          tokens: new Tokens(signer),
          userStore: new UserStore(prisma),
        }
      };
    }
  });

  server.applyMiddleware({
    app, cors: {
      origin: (origin, callback) => {
        // To be able to download schema in client project using intellij plugin
        console.log('ORIGIN IS: ', origin);
        if (!origin) {
          callback(null, true);
          return;
        }
        if (origin && whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }
  });

  app.listen(4000, () => {
    console.log(`
    🚀 Server is up and running.
    🎉 Listening on port 4000.
  `);
  });
};

bootstrap();

