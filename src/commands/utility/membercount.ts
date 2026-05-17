import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "membercount",
  aliases: ["mc", "members", "serverpop"],
  description: "Show the server's member statistics.",
  category: "utility",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const total = guild.memberCount;
    const cached = guild.members.cache;
    const humans = cached.filter((m) => !m.user.bot).size;
    const bots = cached.filter((m) => m.user.bot).size;
    const online = cached.filter((m) => !m.user.bot && m.presence?.status !== "offline").size;
    return ctx.reply({
      embeds: [brandEmbed({
        title: `${guild.name} — Members`,
        thumbnail: guild.iconURL() ?? undefined,
        fields: [
          { name: "Total", value: `${total}`, inline: true },
          { name: "Humans", value: `${humans}`, inline: true },
          { name: "Bots", value: `${bots}`, inline: true },
          { name: "Online (cached)", value: `${online}`, inline: true },
        ],
        page: "Utility",
      })],
    });
  },
};
