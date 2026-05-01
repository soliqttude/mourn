import type { Client, Invite } from "discord.js";
import { upsertInvite } from "../features/invites.js";

export const event = {
  name: "inviteCreate",
  async execute(client: Client, invite: Invite) {
    if (!invite.guild) return;
    await upsertInvite(invite.guild.id, invite.code, invite.uses ?? 0, invite.inviter?.id ?? null);
  },
};
