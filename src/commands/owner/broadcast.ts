import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "broadcast",
  description: "(Owner only) Broadcast a message to every server.",
  usage: "broadcast <message>",
  examples: ["broadcast hey everyone, just dropping a quick update"],
  category: "owner",
  ownerOnly: true,
  noSlash: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("owner only.")] });
    }

    // Use rawArgs so the full message (including newlines via Shift+Enter) is captured
    const msg = ctx.rawArgs?.trim() || ctx.getString("message") || "";
    if (!msg) return ctx.reply({ embeds: [errorEmbed("provide a message to broadcast.")] });

    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setDescription(msg)
      .setFooter({ text: "mourn" })
      .setTimestamp();

    let ok   = 0;
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
        if (channel?.isTextBased()) {
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
      embeds: [successEmbed(`broadcast sent — **${ok}** delivered, **${fail}** failed.`)],
    });
  },
};
