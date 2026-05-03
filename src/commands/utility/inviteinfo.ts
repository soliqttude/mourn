import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "inviteinfo",
  description: "Get info about a Discord invite link.",
  category: "utility",
  aliases: ["ii"],
  options: [{ name: "invite", description: "Invite link or code", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const input = ctx.getString("invite", true) ?? ctx.args[0];
    if (!input) return;
    const code = input.replace(/.*discord\.gg\//, "").replace(/.*discord\.com\/invite\//, "").trim();
    try {
      const invite = await ctx.client.fetchInvite(code);
      return ctx.reply({
        embeds: [brandEmbed({
          title: invite.guild?.name ?? "Invite",
          thumbnail: invite.guild?.iconURL() ?? undefined,
          fields: [
            { name: "Code", value: invite.code, inline: true },
            { name: "Server", value: invite.guild?.name ?? "Unknown", inline: true },
            { name: "Members", value: `${invite.memberCount ?? "?"}`, inline: true },
            { name: "Inviter", value: invite.inviter?.tag ?? "Unknown", inline: true },
            { name: "Channel", value: invite.channel?.name ?? "Unknown", inline: true },
            { name: "Expires", value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : "Never", inline: true },
          ],
          page: "Utility",
        })],
      });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Couldn't fetch that invite.")] });
    }
  },
};
