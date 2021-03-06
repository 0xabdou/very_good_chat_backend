import {AuthResolver} from "../../../../src/features/auth/graphql/resolver";
import Context from '../../../../src/context';
import {
  anything,
  deepEqual,
  instance,
  mock,
  resetCalls,
  verify,
  when
} from "ts-mockito";
import GoogleAPI from "../../../../src/features/auth/data/google-api";
import AuthDataSource
  from "../../../../src/features/auth/data/auth-data-source";
import {Tokens} from "../../../../src/features/auth/data/tokens";
import {Response} from "express";
import {AxiosError} from "axios";
import {mockAuthProviderUser, mockPrismaAuthUser} from "../../../mock-objects";
import {LoginResponse} from "../../../../src/features/auth/graphql/types";

const MockResponse = mock<Response>();
const MockGoogleApi = mock<GoogleAPI>();
const MockAuthDS = mock<AuthDataSource>();
const MockTokens = mock<Tokens>();

const context = {
  req: {},
  res: instance(MockResponse),
  userID: 'userID',
  dataSources: {
    googleAPI: instance(MockGoogleApi),
    authDS: instance(MockAuthDS),
    tokens: instance(MockTokens),
  }
} as Context;

const resolver = new AuthResolver();

const accessToken = 'accessToken';
const refreshToken = 'refreshToken';

beforeEach(() => {
  when(MockGoogleApi.getGoogleUser(anything()))
    .thenResolve(mockAuthProviderUser);
  when(MockAuthDS.findOrCreateAuthUser(anything()))
    .thenResolve(mockPrismaAuthUser);
  when(MockTokens.generateRefreshToken(anything())).thenReturn(refreshToken);
  when(MockTokens.generateAccessToken(anything())).thenReturn(accessToken);
});

beforeEach(() => {
  resetCalls(MockGoogleApi);
  resetCalls(MockAuthDS);
  resetCalls(MockTokens);
});

describe('loginWithGoogle', () => {
  const act = () => resolver.loginWithGoogle({token: 'token'}, context);
  const getThrownError = async () => {
    try {
      await act();
    } catch (e) {
      return e;
    }
  };

  it('should throw INVALID_TOKEN error if googleAPI fails', async () => {
    // arrange
    const error = {
      response: {
        data: {error: 'invalid token'},
      },
      isAxiosError: true,
    } as AxiosError;
    when(MockGoogleApi.getGoogleUser(anything())).thenReject(error);
    // act
    const thrown = await getThrownError();
    // assert
    expect(thrown.extensions.code).toBe('INVALID_TOKEN');
  });

  it('should throw INTERNAL_SERVER_ERROR if authDS fails', async () => {
    // arrange
    when(MockAuthDS.findOrCreateAuthUser(anything()))
      .thenReject(new Error('Blah'));
    // act
    const thrown = await getThrownError();
    // assert
    expect(thrown.extensions.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it(
    'should throw INTERNAL_SERVER_ERROR if generating access token fails',
    async () => {
      // arrange
      when(MockTokens.generateAccessToken(anything()))
        .thenThrow(new Error('Blah'));
      // act
      const thrown = await getThrownError();
      // assert
      expect(thrown.extensions.code).toBe('INTERNAL_SERVER_ERROR');
    }
  );

  it(
    'should throw INTERNAL_SERVER_ERROR if generating refresh token fails',
    async () => {
      // arrange
      when(MockTokens.generateRefreshToken(anything()))
        .thenThrow(new Error('Blah'));
      // act
      const thrown = await getThrownError();
      // assert
      expect(thrown.extensions.code).toBe('INTERNAL_SERVER_ERROR');
    }
  );

  it(
    'should return the right response and set the cookie if everything succeeds',
    async () => {
      // act
      const result = await act();
      // assert
      verify(MockResponse.cookie(
        'veryGoodCookie',
        refreshToken,
        deepEqual({
          path: '/auth',
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
        })
      )).once();
      const expected : LoginResponse = {
        accessToken: accessToken,
        authUser: {
          displayName: mockAuthProviderUser.displayName,
          photoUrl: mockAuthProviderUser.photoURL,
        },
      };
      expect(result).toStrictEqual(expected);
    }
  );
});
