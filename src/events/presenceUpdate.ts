import { type Client, Events } from "discord.js";
import { handleVanityPresence } from "../features/vanityRoles.js";

export const event = {
  name: Events.PresenceUpdate,
  async execute(client: Client, _oldPresence: any, newPresence: any) {
    if (!newPresence.member || newPresence.member.user.bot) return;
    await handleVanityPresence(client, newPresence.member);
  },
};
