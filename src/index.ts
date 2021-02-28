import 'reflect-metadata';
import express, {Request, Response} from 'express';
import session from 'express-session';
import redis from 'redis';
import connectRedis from 'connect-redis';
import {PrismaClient} from "@prisma/client";

import {ApolloServer} from "apollo-server-express";
import {buildSchema, MiddlewareFn} from "type-graphql";
import {AuthResolver} from "./features/auth/resolver";
import {AuthStore, GoogleAPI} from "./features/auth/data";
import axios from "axios";


export type Context = {
  req: Request,
  res: Response,
  dataSources: {
    googleAPI: GoogleAPI,
    authStore: AuthStore,
  }
}

const errorInterceptor: MiddlewareFn<any> = async (_, next) => {
  try {
    return await next();
  } catch (e) {
    console.log(e);
    throw e;
  }
  throw new Error("Very bad");
};

const bootstrap = async () => {
  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(
    session({
      store: new RedisStore({client: redisClient}),
      secret: 'WOW_SUCH_SECRET',
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
      resave: false,
      saveUninitialized: false,
    })
  );

  const prisma = new PrismaClient();

  const schema = await buildSchema({
    resolvers: [AuthResolver],
    globalMiddlewares: [errorInterceptor]
  });
  const server = new ApolloServer({
    schema,
    context: ({req, res}): Context => {
      return {
        req,
        res,
        dataSources: {
          googleAPI: new GoogleAPI(axios),
          authStore: new AuthStore(prisma),
        }
      };
    }
  });

  server.applyMiddleware({app});

  app.listen(4000, () => {
    console.log(`
    🚀 Server is up and running.
    🎉 Listening on port 4000.
  `);
  });
};

bootstrap();

