import {
  Ctx,
  Mutation,
  Resolver,
  ResolverFilterData,
  Root,
  Subscription
} from "type-graphql";
import Context from "../../../shared/context";
import {Conversation} from "./types";

@Resolver()
export default class ChatResolver {


  @Mutation(() => Conversation)
  createConversation() {

  }

  @Subscription({
    topics: 'MESSAGES',
    filter: async (data: ResolverFilterData<any, any, Context>) => {
      return data.context.userID == data.payload.id;
    }
  })
  messages(@Ctx() context: Context, @Root() root: any) {
    return root;
  }
}