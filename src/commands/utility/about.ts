import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "about",
  aliases: ["botinfo"],
  description: "About the Mourn bot.",
  usage: "about",
  examples: ["about"],
  category: "utility",
  async execute(ctx) {
    const guilds = ctx.client.guilds.cache.size;
    const users = ctx.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Mourn",
          description:
            "an all-in-one Discord toolkit — moderation, anti-nuke, anti-raid, full logging, welcome, starboard, reaction roles, voicemaster, tickets, economy, levels, autoresponders, tags, and more.\n\nbuilt by **geico** (@udrs).",
          fields: [
            { name: "Servers", value: String(guilds), inline: true },
            { name: "Users", value: String(users), inline: true },
            { name: "Prefix", value: `\`${ctx.prefix}\``, inline: true },
          ],
          thumbnail: ctx.client.user?.displayAvatarURL({ size: 256 }) ?? undefined,
          page: "About",
        }),
      ],
    });
  },
};
