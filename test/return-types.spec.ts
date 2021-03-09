import {
  ofTypeGraphQLUpload,
  returnsBoolean,
  returnsLoginResponse,
  returnsString,
  returnsUser
} from "../src/shared/graphql/return-types";
import {LoginResponse} from "../src/features/auth/graphql/types";
import {User} from "../src/features/user/graphql/types";
import {GraphQLUpload} from "graphql-upload";

test('returnsString', () => {
  expect(returnsString()).toBe(String);
});

test('returnsLoginResponse', () => {
  expect(returnsLoginResponse()).toBe(LoginResponse);
});

test('returnsUser', () => {
  expect(returnsUser()).toBe(User);
});

test('returnsBoolean', () => {
  expect(returnsBoolean()).toBe(Boolean);
})

test('ofGraphQLUpload', () => {
  expect(ofTypeGraphQLUpload()).toBe(GraphQLUpload);
})