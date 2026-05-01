import type { Client, Invite } from "discord.js";
import { removeInvite } from "../features/invites.js";

export const event = {
  name: "inviteDelete",
  async execute(client: Client, invite: Invite) {
    if (!invite.guild) return;
    await removeInvite(invite.guild.id, invite.code);
  },
};
