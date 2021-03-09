import JWT from 'jsonwebtoken';
import signer from "../../../../src/features/auth/data/signer";

afterAll(() => {
  jest.clearAllMocks();
});

// dumb testing
it('should ', function () {
  expect(signer.sign).toBe(JWT.sign);
  expect(signer.verify).toBe(JWT.verify);
});