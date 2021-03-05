import {
  anything,
  deepEqual,
  instance,
  mock,
  resetCalls,
  verify,
  when
} from "ts-mockito";
import {Signer} from '../../../../src/features/auth/data/signer';
import {Tokens} from "../../../../src/features/auth/data/tokens";

const userID = 'someUserID';
const token = 'someToken';
const MockSigner = mock<Signer>();
const tokens = new Tokens(instance(MockSigner));

beforeAll(() => {
  when(MockSigner.sign(anything(), anything(), anything())).thenReturn(token);
  when(MockSigner.sign(anything(), anything())).thenReturn(token);
  when(MockSigner.verify(anything(), anything()))
    .thenReturn({userID});
});

beforeEach(() => {
  resetCalls(MockSigner);
});

it('should generate and verify access tokens', () => {
  // act
  const codedToken = tokens.generateAccessToken(userID);
  // assert
  verify(MockSigner.sign(
    deepEqual({userID}),
    process.env.ACCESS_TOKEN_SECRET!,
    deepEqual({expiresIn: '1h'}),
  )).once();
  expect(codedToken).toBe(token);
  // act again
  const decodedUserID = tokens.verifyAccessToken(codedToken);
  // assert again
  verify(MockSigner.verify(codedToken, process.env.ACCESS_TOKEN_SECRET!))
    .once();
  expect(decodedUserID).toBe(userID);
});

it('should generate and verify refresh tokens', () => {
  // act
  const codedToken = tokens.generateRefreshToken(userID);
  // assert
  verify(MockSigner.sign(
    deepEqual({userID}),
    process.env.REFRESH_TOKEN_SECRET!,
  )).once();
  expect(codedToken).toBe(token);
  // act again
  const decodedUserID = tokens.verifyRefreshToken(codedToken);
  // assert again
  verify(MockSigner.verify(codedToken, process.env.REFRESH_TOKEN_SECRET!))
    .once();
  expect(decodedUserID).toBe(userID);
});