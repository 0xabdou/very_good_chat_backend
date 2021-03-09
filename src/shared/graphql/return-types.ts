import {LoginResponse} from "../../features/auth/graphql/types";
import {User} from "../../features/user/graphql/types";
import {GraphQLUpload} from "graphql-upload";

export const returnsString = () => String;
export const returnsBoolean = () => Boolean;
export const returnsLoginResponse = () => LoginResponse;
export const returnsUser = () => User;
export const ofTypeGraphQLUpload = () => GraphQLUpload;
