import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "broadcast",
  description: "(Owner only) Broadcast a message to every server.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "message", description: "Message to send", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const msg = ctx.getString("message", true);
    if (!msg) return ctx.reply({ embeds: [errorEmbed("Message required.")] });
    if (ctx.user.id !== config.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("Owner only.")] });
    }
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle("📢 Bleed Announcement")
      .setDescription(msg)
      .setFooter({ text: `From the bot owner` })
      .setTimestamp();
    let ok = 0;
    let fail = 0;
    for (const [, guild] of ctx.client.guilds.cache) {
      try {
        const channel =
          guild.systemChannel ??
          guild.channels.cache.find(
            (c) =>
              c.isTextBased() &&
              guild.members.me?.permissionsIn(c).has("SendMessages") === true
          );
        if (channel && channel.isTextBased()) {
          await (channel as any).send({ embeds: [eb] });
          ok++;
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }
    return ctx.reply({
      embeds: [successEmbed(`Broadcast: **${ok}** ok, **${fail}** failed.`)],
      ephemeral: true,
    });
  },
};
