import {PrismaClient} from '@prisma/client';
import createApp from "../../../src/app";
import container, {initContainer} from "../../../src/service-locator/container";
import TYPES from "../../../src/service-locator/types";
import request from 'supertest';
import {ContextDataSources} from "../../../src/app/context";
import GoogleAPI from "../../../src/features/auth/data/google-api";

/**
 * This is supposed to be an integration test file
 * Leaving it here for future use
 */

const config: any = {};

beforeAll(async (done) => {
  await initContainer();
  const dataSources =
    container.get<ContextDataSources>(TYPES.ContextDataSources);
  dataSources.googleAPI = {} as GoogleAPI;
  config.app = await createApp(dataSources);
  await container.get<PrismaClient>(TYPES.PrismaClient).$connect();
  const port = process.env.PORT;
  config.server = config.app.listen(port, () => {
    console.log(`
    🚀 Server is up and running.
    🎉 Listening on port ${port}.
  `);
  });
  done();
});

afterAll(async (done) => {
  await container.get<PrismaClient>(TYPES.PrismaClient).$disconnect();
  config.server.close();
  done();
});

it('should connect successfully', async () => {
  const LOGIN_WITH_GOOGLE = `
      mutation LoginWithGoogleMutation($loginWithGoogleInput: LoginInput!) {
          loginWithGoogle(input: $loginWithGoogleInput) {
              accessToken
              authUser {
                  displayName
                  photoUrl
              }
          }
      }
  `;
  const res = await request(config.app)
    .post('/graphql')
    .send({
      operationName: "LoginWithGoogleMutation",
      query: LOGIN_WITH_GOOGLE,
      variables: {
        loginWithGoogleInput: {
          token: 'google_id_token',
        }
      },
    })
  console.log(res);
  expect(res.status).toBe(200);
});