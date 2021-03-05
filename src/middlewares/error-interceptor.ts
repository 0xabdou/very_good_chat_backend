import {MiddlewareFn} from "type-graphql";

const errorInterceptor: MiddlewareFn<any> = async (_, next) => {
  try {
    return await next();
  } catch (e) {
    console.log(e.message);
    throw e;
  }
};

export default errorInterceptor
