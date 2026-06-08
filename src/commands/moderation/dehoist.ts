import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "dehoist",
  description: "Remove hoisting characters from member nicknames.",
  category: "moderation",
  aliases: ["antihoist"],
  guildOnly: true,
  userPermissions: ["ManageNicknames"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const hoistChars = /^[!-\/:-@[-`{-~]/;
    const members = await ctx.guild.members.fetch();
    let changed = 0;
    for (const [, member] of members) {
      const name = member.displayName;
      if (hoistChars.test(name)) {
        const cleaned = name.replace(/^[!-\/:-@[-`{-~]+/, "").trim() || "Dehoisted";
        await member.setNickname(cleaned, `Dehoisted by ${ctx.user.tag}`).catch(() => null);
        changed++;
      }
    }
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Dehoist").setDescription(`Cleaned **${changed}** nickname(s).`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
