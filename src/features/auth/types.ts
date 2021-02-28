import {Field, ObjectType} from "type-graphql";

@ObjectType()
export class LoginResponse {
  @Field()
  accessToken!: string;
  @Field({nullable: true})
  displayName?: string;
  @Field({nullable: true})
  photoUrl?: string;
}