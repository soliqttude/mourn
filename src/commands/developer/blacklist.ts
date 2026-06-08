import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";
const blacklist = new Set<string>();

export const command: HybridCommand = {
  name: "blacklist",
  description: "(Dev) Blacklist a user from using the bot.",
  category: "developer",
  aliases: ["block"],
  ownerOnly: true,
  options: [{ name: "user", description: "User to blacklist", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const target = await ctx.getUser("user");
    if (!target) return ctx.reply({ content: "Provide a user.", ephemeral: true } as any);
    if (blacklist.has(target.id)) {
      blacklist.delete(target.id);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Removed **${target.username}** from the blacklist.`).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
    }
    blacklist.add(target.id);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`🚫 **${target.username}** has been blacklisted.`).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
