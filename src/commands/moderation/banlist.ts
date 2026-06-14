import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "banlist",
  aliases: ["bans", "banned"],
  description: "List all banned users in the server.",
  usage: "banlist",
  examples: ["banlist"],
  category: "moderation",
  permission: "ban_members",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const bans = await ctx.guild.bans.fetch();
    if (!bans.size) return ctx.reply({ embeds: [brandEmbed({ title: "Ban List", description: "No banned users.", page: "Moderation" })] });
    const list = bans.first(20).map((b, i) => `${i + 1}. **${b.user.tag}** — ${b.reason ?? "No reason"}`).join("\n");
    return ctx.reply({
      embeds: [brandEmbed({
        title: `Ban List — ${bans.size} banned`,
        description: list + (bans.size > 20 ? `\n...and ${bans.size - 20} more.` : ""),
        page: "Moderation",
      })],
    });
  },
};
