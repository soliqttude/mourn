import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "boosters",
  description: "List all current server boosters.",
  category: "utility",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const boosters = guild.members.cache
      .filter((m) => !!m.premiumSince)
      .sort((a, b) => a.premiumSince!.getTime() - b.premiumSince!.getTime());
    if (!boosters.size) return ctx.reply({ embeds: [errorEmbed("No boosters found.")] });
    const desc = boosters.map((m) => `<@${m.id}> — since <t:${Math.floor(m.premiumSince!.getTime() / 1000)}:R>`).join("\n");
    return ctx.reply({
      embeds: [brandEmbed({
        title: `${guild.name} Boosters (${boosters.size})`,
        description: desc.slice(0, 4000),
        thumbnail: guild.iconURL() ?? undefined,
        page: "Utility",
      })],
    });
  },
};
