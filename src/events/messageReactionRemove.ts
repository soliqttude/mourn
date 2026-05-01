import type {
  Client,
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
} from "discord.js";
import { handleStarboardReaction } from "../features/starboard.js";
import { handleReactionRoleRemove } from "../features/reactionRoles.js";

export const event = {
  name: "messageReactionRemove",
  async execute(
    client: Client,
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch {
      return;
    }
    await handleStarboardReaction(client, reaction as MessageReaction);
    await handleReactionRoleRemove(client, reaction as MessageReaction, user as User);
  },
};
