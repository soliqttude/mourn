import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "unhoist", aliases: ["dehoist"], description: "Remove leading special characters from all member nicknames.", category: "moderation", permission: "manage_nicknames", guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    await ctx.defer();
    const members = await ctx.guild.members.fetch();
    const hoistRe = /^[^a-zA-Z0-9]/;
    let count = 0, failed = 0;
    for (const [, member] of members) {
      if (member.user.bot) continue;
      const display = member.displayName;
      if (hoistRe.test(display)) {
        const newNick = display.replace(/^[^a-zA-Z0-9]+/, "").trim() || "member";
        try { await member.setNickname(newNick, `Dehoist by ${ctx.user.tag}`); count++; } catch { failed++; }
      }
    }
    return ctx.reply({ embeds: [successEmbed(`Dehoisted **${count}** members${failed ? `, failed on **${failed}**` : ""}.`)] });
  },
};
