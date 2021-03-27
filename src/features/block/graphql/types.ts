import {Field, ObjectType} from "type-graphql";
import {User} from "../../user/graphql/types";

@ObjectType()
export class Block {
  @Field()
  user!: User;
  @Field()
  date!: Date;
}