import {ArgsType, Field, InputType, ObjectType} from "type-graphql";
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
  photoURLSource?: string;
  @Field({nullable: true})
  photoURLMedium?: string;
  @Field({nullable: true})
  photoURLSmall?: string;
}

@ObjectType()
export class Me {
  @Field()
  user!: User;
  // The fields below are private
  @Field()
  activeStatus!: boolean;
}

@InputType()
export class UserCreation {
  @Field()
  username!: string;
  @Field({nullable: true})
  name?: string;
  @Field(() => GraphQLUpload, {nullable: true})
  photo?: Promise<FileUpload>;
}

@InputType()
export class UserUpdate {
  @Field({nullable: true})
  username?: string;
  @Field({nullable: true})
  name?: string;
  @Field({nullable: true})
  deleteName?: Boolean;
  @Field(() => GraphQLUpload, {nullable: true})
  photo?: Promise<FileUpload>;
  @Field({nullable: true})
  deletePhoto?: Boolean;
}

@ArgsType()
export class GerUserArgs {
  @Field({nullable: true})
  id?: string;
  @Field({nullable: true})
  username?: string;
}