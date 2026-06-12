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
          description: `mourn is a free all-in-one Discord bot built for modern communities.

Featuring moderation, security, automod, antinuke, antiraid, leveling, tickets, giveaways, utility tools, and much more, mourn is designed to provide everything your server needs in a single, reliable experience.

The bot is actively maintained and continuously updated with new features, improvements, and fixes.

If you have any questions, feedback, or bug reports, feel free to reach out:

@udrs • @remandment`,
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
