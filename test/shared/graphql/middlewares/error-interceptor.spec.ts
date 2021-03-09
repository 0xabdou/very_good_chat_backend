import errorInterceptor
  from "../../../../src/shared/graphql/middlewares/error-interceptor";
import {ResolverData} from "type-graphql";

it('should call next and throw errors', async ()=> {
  // arrange
  const error = new Error('yes');
  const next = jest.fn(async () => {
    throw error;
  });
  // act
  try {
    await errorInterceptor({} as ResolverData<any>, next);
  } catch (e) {
    // assert
    expect(next).toBeCalledTimes(1);
    expect(e).toBe(error);
  }
});