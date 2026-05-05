import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "leaveserver",
  description: "(Owner only) Force the bot to leave a server.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID to leave", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const guildId = ctx.getString("guild_id", true) ?? ctx.rawArgs.trim();
    if (!guildId) return ctx.reply({ content: "Provide a guild ID." });
    const guild = ctx.client.guilds.cache.get(guildId);
    if (!guild) return ctx.reply({ content: "Not in that server." });
    const name = guild.name;
    await guild.leave();
    const eb = new EmbedBuilder()
      .setColor(config.errorColor)
      .setTitle("👋 Left Server")
      .setDescription(`Left **${name}** (\`${guildId}\`) successfully.`)
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
