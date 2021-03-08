import {returnsLoginResponse, returnsString} from "../src/return-types";
import {LoginResponse} from "../src/features/auth/graphql/types";

test('returnsString', () => {
  expect(returnsString()).toBe(String);
});

test('returnsLoginResponse', () => {
  expect(returnsLoginResponse()).toBe(LoginResponse);
});