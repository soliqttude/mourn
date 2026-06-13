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

    const msg = ctx.rawArgs?.trim() || ctx.getString("message") || "";
    if (!msg) return ctx.reply({ embeds: [errorEmbed("provide a message to broadcast.")] });

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
          // Send as plain content so links (discord.gg, etc) are always clickable
          await (channel as any).send({ content: msg });
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
