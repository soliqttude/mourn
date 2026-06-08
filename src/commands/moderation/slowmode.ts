import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "slowmode",
  description: "Set channel slowmode.",
  category: "moderation",
  aliases: ["ratelimit", "rl"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "seconds", description: "Slowmode seconds (0 to disable)", type: ApplicationCommandOptionType.Integer, required: true }, { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const secs = ctx.getNumber("seconds") ?? parseInt(ctx.args[0] ?? "0");
    const ch = (ctx.getChannel ? ctx.getChannel("channel") : null) ?? ctx.channel as any;
    if (!ch?.setRateLimitPerUser) return ctx.reply({ content: "Invalid channel.", ephemeral: true } as any);
    await ch.setRateLimitPerUser(secs, `Set by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(secs === 0 ? `✅ Slowmode disabled in <#${ch.id}>.` : `✅ Slowmode set to **${secs}s** in <#${ch.id}>.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
