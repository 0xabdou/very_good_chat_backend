import {MiddlewareFn} from "type-graphql";
import {Context} from "../../index";

export const isAuthenticated: MiddlewareFn<Context> = async ({context}, next) => {
  return next();
};