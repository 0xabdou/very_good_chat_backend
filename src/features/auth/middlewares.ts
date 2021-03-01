import {MiddlewareFn} from "type-graphql";
import {Context} from "../../index";
import {AuthenticationError} from "apollo-server-express";

export const isAuthenticated: MiddlewareFn<Context> = async ({context}, next) => {
  const authorization = context.req.headers.authorization;
  if (!authorization)
    throw new AuthenticationError('Must provide an access token');
  const segments = authorization.split(' ');
  if (segments.length < 2)
    throw new AuthenticationError('Must provide an access token');
  const token = segments[1];
  try {
    context.userID = context.dataSources.tokens.verifyToken(token);
  } catch (e) {
    console.log(e);
    throw new AuthenticationError('Invalid access token');
  }
  return next();
};