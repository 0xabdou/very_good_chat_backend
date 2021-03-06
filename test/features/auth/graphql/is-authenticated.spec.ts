import Context from '../../../../src/context';
import {anything, instance, mock, resetCalls, verify, when} from "ts-mockito";
import {Tokens} from "../../../../src/features/auth/data/tokens";
import isAuthenticated
  from "../../../../src/features/auth/graphql/is-authenticated";
import {NextFn, ResolverData} from "type-graphql";
import {AuthenticationError} from "apollo-server-express";

const MockTokens = mock<Tokens>();

const nextResult = {data: 'success'};
const nextFn = jest.fn(() => nextResult);

const getNextFn = () => nextFn as unknown as NextFn;

const getResolverData = (authorization?: string) => {
  return {
    context: {
      req: {headers: {authorization}},
      dataSources: {tokens: instance(MockTokens)}
    } as Context
  } as ResolverData<Context>;
};

const act = (auth?: string, data?: ResolverData<Context>) =>
  isAuthenticated(data ?? getResolverData(auth), getNextFn());

beforeEach(() => {
  resetCalls(MockTokens);
})

it(
  'should should throw an authentication error if no authorization header was sent',
  () => {
    expect(act).toThrow(AuthenticationError);
  }
);

it(
  'should should throw an authentication error the authorization header has no token',
  () => {
    expect(() => act('Bearer')).toThrow(AuthenticationError);
  }
);

describe('When the authorization header exists and contains a token', () => {
  const auth = 'Bearer token';

  it('should throw an authentication error if the verification fails', () => {
    // arrange
    when(MockTokens.verifyAccessToken(anything()))
      .thenThrow(new Error('Verification failed'));
    // act and assert
    expect(() => act(auth)).toThrow(AuthenticationError);
    verify(MockTokens.verifyAccessToken('token')).once();
  });

  it(
    `should set the userID in the context, and return calling the next 
  function, if the verification succeeds`,
    () => {
      // arrange
      const data = getResolverData(auth);
      const userID = 'userID';
      when(MockTokens.verifyAccessToken(anything())).thenReturn(userID);
      // act and assert
      expect(act(auth, data)).toEqual(nextResult);
      expect(data.context.userID).toEqual(userID);
      verify(MockTokens.verifyAccessToken('token')).once();
    }
  );
});