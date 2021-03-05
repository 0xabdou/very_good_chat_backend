import 'reflect-metadata';
import express from 'express';

import {ApolloServer, GetMiddlewareOptions} from "apollo-server-express";
import {buildSchema} from "type-graphql";
import {AuthResolver} from "./features/auth/graphql/resolver";
import cors from 'cors';
import cookieParser from "cookie-parser";
import {UserResolver} from "./features/user/graphql/resolver";
import {graphqlUploadExpress} from 'graphql-upload';
import errorInterceptor from "./middlewares/error-interceptor";
import authRouter from "./features/auth/rest/router";
import corsOptions from "./cors";
import container, {initContainer} from "./service-locator/container";
import TYPES from "./service-locator/types";
import Context from "./context";

const bootstrap = async () => {
  // Initialize IoC container
  await initContainer();

  const app = express();
  const CORS = cors(corsOptions);

  app.use(express.static('storage'));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(graphqlUploadExpress({maxFileSize: 10000000, maxFiles: 10}));
  // Token related auth stuff are not handled by this express middleware
  app.use('/auth', CORS, authRouter(container.get(TYPES.Tokens)));

  // GraphQL server stuff
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
        dataSources: container.get(TYPES.ContextDataSources),
      };
    }
  });
  server.applyMiddleware({
    app,
    cors: corsOptions as GetMiddlewareOptions['cors'],
  });

  // Start the server
  app.listen(4000, () => {
    console.log(`
    🚀 Server is up and running.
    🎉 Listening on port 4000.
  `);
  });
};

bootstrap();

