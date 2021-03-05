import {Field, InputType, ObjectType} from "type-graphql";
import {FileUpload, GraphQLUpload} from "graphql-upload";

@ObjectType()
export class User {
  @Field()
  id!: string;
  @Field()
  username!: string;
  @Field({nullable: true})
  name?: string;
  @Field({nullable: true})
  photoURL?: string;
}

@InputType()
export class UserCreation {
  @Field()
  username!: string;
  @Field({nullable: true})
  name?: string;
  @Field(() => GraphQLUpload, {nullable: true})
  photo?: FileUpload;
}
