import container from "./service-locator/container";
import express, {Express} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {graphqlUploadExpress} from "graphql-upload";
import authRouter from "./features/auth/rest/router";
import TYPES from "./service-locator/types";
import {buildSchema} from "type-graphql";
import {AuthResolver} from "./features/auth/graphql/resolver";
import {UserResolver} from "./features/user/graphql/resolver";
import {ApolloServer, GetMiddlewareOptions} from "apollo-server-express";
import errorInterceptor from "./shared/graphql/middlewares/error-interceptor";
import Context, {ToolBox} from "./shared/context";
import corsOptions from "./shared/cors";
import FriendResolver from "./features/friend/graphql/resolver";
import BadgeResolver from "./features/badge/graphql/resolver";
import NotificationResolver from "./features/notification/graphql/resolver";
import BlockResolver from "./features/block/graphql/resolver";
import ChatResolver from "./features/chat/graphql/resolver";
import {Tokens} from "./features/auth/data/tokens";

const createApp = async (toolBox: ToolBox): Promise<[ApolloServer, Express]> => {
  const app = express();
  const CORS = cors(corsOptions);

  app.use(express.static('storage'));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(graphqlUploadExpress({maxFileSize: 10000000, maxFiles: 10}));
  // Token related auth stuff are not handled by this express middleware
  app.use('/auth', CORS, authRouter(container.get(TYPES.Tokens)));

  // GraphQL server stuff
  const schema = await buildSchema({
    resolvers: [
      AuthResolver,
      UserResolver,
      FriendResolver,
      BadgeResolver,
      BlockResolver,
      NotificationResolver,
      ChatResolver,
    ],
    globalMiddlewares: [errorInterceptor],
    dateScalarMode: 'timestamp'
  });
  const server = new ApolloServer({
    schema,
    uploads: false,
    subscriptions: {
      onConnect: (connectionParams: any, webSocket, context) => {
        console.log('Connected!');
        const accessToken = connectionParams.accessToken;
        const tokens = container.get<Tokens>(TYPES.Tokens);
        const userID = tokens.verifyAccessToken(accessToken);
        return {userID};
      },
      onDisconnect: (webSocket, context) => {
        console.log('Disconnected!');
      },
      path: '/subscriptions'
    },
    context: ({req, res, connection}): Context => {
      return {
        req,
        res,
        connection,
        toolBox
      };
    }
  });
  server.applyMiddleware({
    app,
    cors: corsOptions as GetMiddlewareOptions['cors'],
  });
  return [server, app];
};

export default createApp;