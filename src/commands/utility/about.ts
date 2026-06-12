import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "about",
  aliases: ["info"],
  description: "About mourn.",
  usage: "about",
  examples: ["about"],
  category: "utility",
  async execute(ctx) {
    const guilds = ctx.client.guilds.cache.size;
    const users  = ctx.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);

    return ctx.reply({
      embeds: [
        brandEmbed({
          authorName: ctx.client.user?.username ?? "mourn",
          authorIcon: ctx.client.user?.displayAvatarURL({ size: 64 }) ?? undefined,
          thumbnail:  ctx.client.user?.displayAvatarURL({ size: 256 }) ?? undefined,
          description: `mourn is a private Discord bot i built for my own servers. covers moderation, logging, antinuke, antiraid, automod, tickets, economy, levels, and more. been building it for a while and i'm still adding to it.\n\nif something's broken or you have a suggestion, message \`geico\` on Discord.`,
          fields: [
            { name: "servers", value: `${guilds}`,                   inline: true },
            { name: "users",   value: `${users.toLocaleString()}`,   inline: true },
            { name: "uptime",  value: `${h}h ${m}m`,                 inline: true },
            { name: "prefix",  value: `\`${ctx.prefix}\``,           inline: true },
          ],
          page: "About",
        }),
      ],
    });
  },
};
