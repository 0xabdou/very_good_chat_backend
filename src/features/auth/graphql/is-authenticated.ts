import {MiddlewareFn} from "type-graphql";
import {AuthenticationError} from "apollo-server-express";
import Context from "../../../shared/context";

const isAuthenticated: MiddlewareFn<Context> = ({context}, next) => {
  const authorization = context.req.headers.authorization;
  if (!authorization)
    throw new AuthenticationError('Must provide an access token');
  const segments = authorization.split(' ');
  if (segments.length < 2)
    throw new AuthenticationError('Must provide an access token');
  const token = segments[1];
  try {
    context.userID =
      context.toolBox.dataSources.tokens.verifyAccessToken(token);
  } catch (e) {
    console.log(e);
    throw new AuthenticationError('Invalid access token');
  }
  return next();
};

export default isAuthenticated;