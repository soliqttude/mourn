import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "remind",
  description: "Set a reminder.",
  category: "utility",
  aliases: ["reminder", "remindme"],
  options: [
    { name: "time", description: "Time (e.g. 10m, 1h, 2d)", type: ApplicationCommandOptionType.String, required: true },
    { name: "message", description: "What to remind you about", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const time = ctx.getString("time") ?? ctx.args[0];
    const message = ctx.getString("message") ?? ctx.args.slice(1).join(" ");
    if (!time || !message) return ctx.reply({ content: "Provide time and message.", ephemeral: true } as any);
    const ms = time.endsWith("d") ? parseInt(time)*86400000 : time.endsWith("h") ? parseInt(time)*3600000 : time.endsWith("m") ? parseInt(time)*60000 : time.endsWith("s") ? parseInt(time)*1000 : 0;
    if (!ms || ms < 1000) return ctx.reply({ content: "Invalid time format. Use e.g. 10m, 1h, 2d.", ephemeral: true } as any);
    if (ms > 2592000000) return ctx.reply({ content: "Maximum reminder time is 30 days.", ephemeral: true } as any);
    await ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("⏰ Reminder Set").setDescription(`I'll remind you in **${time}**!\n**Message:** ${message}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    setTimeout(async () => {
      const embed = new EmbedBuilder().setColor(0xffd700).setTitle("⏰ Reminder!").setDescription(message).setFooter({ text: `Reminder set ${time} ago • ${config.embedFooter}` }).setTimestamp();
      await ctx.user.send({ embeds: [embed] }).catch(() => ctx.channel?.send({ content: `<@${ctx.user.id}>`, embeds: [embed] }).catch(() => null));
    }, ms);
  },
};
