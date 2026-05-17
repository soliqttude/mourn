import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "gnuke",
  description: "(Owner only) Remove a user from every server the bot is in.",
  usage: "gnuke [user_id] [reason]",
  examples: ["gnuke Rule violation"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "user_id", description: "User ID to remove", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const userId = ctx.getString("user_id", true) ?? ctx.args[0];
    const reason = ctx.getString("reason") ?? "Global action by bot owner";
    if (!userId) return ctx.reply({ content: "Provide a user ID." });
    await ctx.defer(true);
    let banned = 0, kicked = 0, failed = 0;
    for (const [, guild] of ctx.client.guilds.cache) {
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) continue;
        if (guild.members.me?.permissions.has("BanMembers")) {
          await guild.members.ban(userId, { reason });
          banned++;
        } else if (guild.members.me?.permissions.has("KickMembers")) {
          await member.kick(reason);
          kicked++;
        } else { failed++; }
      } catch { failed++; }
    }
    const eb = new EmbedBuilder()
      .setColor(config.errorColor)
      .setTitle("☢️ Global Nuke Complete")
      .setDescription(`User \`${userId}\` removed from all reachable servers.`)
      .addFields(
        { name: "Banned", value: `${banned}`, inline: true },
        { name: "Kicked", value: `${kicked}`, inline: true },
        { name: "Failed", value: `${failed}`, inline: true },
      )
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb] });
  },
};
