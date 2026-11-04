import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "threadremove",
  description: "Remove a member from the current thread.",
  category: "thread",
  aliases: ["removethreadmember"],
  guildOnly: true,
  userPermissions: ["ManageThreads"],
  options: [{ name: "member", description: "Member to remove", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const channel = ctx.channel as any;
    if (!channel?.isThread?.()) return ctx.reply({ embeds: [errorEmbed("Run this command inside a thread.")] });
    const member = await ctx.getMember("member", true);
    if (!member) return;
    try {
      await channel.members.remove(member.id, `Removed by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Removed **${member.user.tag}** from this thread.`)] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not remove that member.")] });
    }
  },
};
