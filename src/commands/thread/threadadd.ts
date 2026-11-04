import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "threadadd",
  description: "Add a member to the current thread.",
  category: "thread",
  aliases: ["addthreadmember"],
  guildOnly: true,
  userPermissions: ["ManageThreads"],
  options: [{ name: "member", description: "Member to add", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const channel = ctx.channel as any;
    if (!channel?.isThread?.()) return ctx.reply({ embeds: [errorEmbed("Run this command inside a thread.")] });
    const member = await ctx.getMember("member", true);
    if (!member) return;
    try {
      await channel.members.add(member.id, `Added by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Added **${member.user.tag}** to this thread.`)] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not add that member.")] });
    }
  },
};
