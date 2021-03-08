import request from "supertest";
import express from "express";
import authRouter from "../../../../src/features/auth/rest/router";
import {anything, instance, mock, resetCalls, verify, when} from "ts-mockito";
import {Tokens} from "../../../../src/features/auth/data/tokens";
import cookieParser from "cookie-parser";

const MockTokens = mock<Tokens>();
const app = express();
const router = authRouter(instance(MockTokens));

beforeAll(() => {
  app.use(cookieParser());
  app.use('/auth', router);

});

beforeEach(() => {
  resetCalls(MockTokens);
})

const refreshToken = 'blablabla';
const accessToken = 'duhudhuhduhduhd';
const userID = 'userIDDDDDD';



describe('/auth/refresh_token', () => {
  it('should return 401 if no cookie is set', async () => {
    // act
    const req = request(app)
      .get('/auth/refresh_token');
    const res = await req;
    // assert
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHENTICATED');
  });

  it('should return 401 if the token in the cookie is invalid', async () => {
    // arrange
    when(MockTokens.verifyRefreshToken(anything()))
      .thenThrow(new Error('Invalid refresh token'));
    // act
    const req = request(app)
      .get('/auth/refresh_token')
      .set('Cookie', `veryGoodCookie=${refreshToken}`);
    const res = await req;
    // assert
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHENTICATED');
    verify(MockTokens.verifyRefreshToken(refreshToken)).once();
  });

  it(
    'should return 200 with the access token if the access token is valid',
    async () => {
      // arrange
      when(MockTokens.verifyRefreshToken(anything()))
        .thenReturn(userID);
      when(MockTokens.generateAccessToken(anything())).thenReturn(accessToken);
      // act
      const req = request(app)
        .get('/auth/refresh_token')
        .set('Cookie', `veryGoodCookie=${refreshToken}`);
      const res = await req;
      // assert
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe(accessToken);
      verify(MockTokens.verifyRefreshToken(refreshToken)).once();
      verify(MockTokens.generateAccessToken(userID)).once();
      console.log(res.headers);
    }
  );
});

// Very hacky testing
describe('/auth/logout', () => {
  beforeAll(() => {
    app.get('/mock_login', (req, res) => {
      res.cookie(
        'veryGoodCookie',
        refreshToken,
        {
          path: '/auth',
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
        }
      );
      return res.status(200).json({data: 'success'});
    })

    app.get('/auth/getCookie', (req, res) => {
      const cookie = req.cookies.veryGoodCookie;
      return res.status(200).json({cookie: cookie});
    })
  });

  it('should clear the cookie and return success', async () => {
    // arrange
    const agent = request.agent(app);
    // login and expect the cookie to be set
    await agent.get('/mock_login');
    const res1 = await agent.get('/auth/getCookie')
    expect(res1.body.cookie).toBe(refreshToken);
    // logout
    const res2 = await agent.get('/auth/logout');
    // expect the body
    expect(res2.body.data).toBe('success');
    // expect the cookie to be cleared
    const res3 = await agent.get('/auth/getCookie');
    expect(res3.body.cookie).toBeUndefined();
    // act
  });
});