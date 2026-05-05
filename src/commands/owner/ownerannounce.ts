import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ownerannounce",
  description: "(Owner only) Send an announcement embed to every server.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "title", description: "Announcement title", type: ApplicationCommandOptionType.String, required: true },
    { name: "body", description: "Announcement body", type: ApplicationCommandOptionType.String, required: true },
    { name: "color", description: "Hex color e.g. ff0000", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const title = ctx.getString("title", true) ?? "Announcement";
    const body = ctx.getString("body", true) ?? "";
    const colorHex = ctx.getString("color") ?? "";
    const color = colorHex ? parseInt(colorHex.replace("#", ""), 16) : config.brandColor;
    await ctx.defer(true);
    const eb = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📣 ${title}`)
      .setDescription(body)
      .setAuthor({ name: ctx.client.user?.username ?? "Mourn", iconURL: ctx.client.user?.displayAvatarURL() })
      .setFooter({ text: config.embedFooter })
      .setTimestamp();
    let ok = 0, fail = 0;
    for (const [, guild] of ctx.client.guilds.cache) {
      try {
        const channel = guild.systemChannel
          ?? guild.channels.cache.find(c => c.isTextBased() && guild.members.me?.permissionsIn(c).has("SendMessages"));
        if (channel?.isTextBased()) { await (channel as any).send({ embeds: [eb] }); ok++; } else fail++;
      } catch { fail++; }
    }
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.successColor).setDescription(`📣 Sent to **${ok}** servers. **${fail}** failed.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
