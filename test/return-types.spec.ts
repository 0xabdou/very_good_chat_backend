import {
  ofTypeFriendshipStatus,
  ofTypeGraphQLUpload,
  returnsBoolean, returnsFriendship, returnsFriendshipInfo, returnsListOfUsers,
  returnsLoginResponse,
  returnsString,
  returnsUser
} from "../src/shared/graphql/return-types";
import {LoginResponse} from "../src/features/auth/graphql/types";
import {User} from "../src/features/user/graphql/types";
import {GraphQLUpload} from "graphql-upload";
import {
  Friendship,
  FriendshipInfo,
  FriendshipStatus
} from "../src/features/friend/graphql/types";

test('returnsString', () => {
  expect(returnsString()).toBe(String);
});

test('returnsBoolean', () => {
  expect(returnsBoolean()).toBe(Boolean);
})

test('returnsLoginResponse', () => {
  expect(returnsLoginResponse()).toBe(LoginResponse);
});

test('returnsUser', () => {
  expect(returnsUser()).toBe(User);
});

test('returnsListOfUsers', () => {
  expect(returnsListOfUsers()).toStrictEqual([User]);
});

test('returnsFriendshipInfo', () => {
  expect(returnsFriendshipInfo()).toBe(FriendshipInfo);
});

test('returnsFriendship', () => {
  expect(returnsFriendship()).toBe(Friendship);
});


test('ofTypeGraphQLUpload', () => {
  expect(ofTypeGraphQLUpload()).toBe(GraphQLUpload);
})

test('ofTypeFriendshipStatus', () => {
  expect(ofTypeFriendshipStatus()).toBe(FriendshipStatus);
})
