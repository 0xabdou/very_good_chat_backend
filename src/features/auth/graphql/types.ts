import {Field, ObjectType} from "type-graphql";

@ObjectType()
export class AuthUser {
  @Field({nullable: true})
  displayName?: string;
  @Field({nullable: true})
  photoUrl?: string;
}

@ObjectType()
export class LoginResponse {
  @Field()
  accessToken!: string;
  @Field()
  authUser!: AuthUser;
}

