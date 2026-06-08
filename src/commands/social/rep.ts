import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const repMap = new Map<string, number>();
const cooldowns = new Map<string, number>();

export const command: HybridCommand = {
  name: "rep",
  description: "Give reputation to a user.",
  category: "social",
  aliases: ["reputation", "+rep"],
  guildOnly: true,
  options: [{ name: "user", description: "User to rep", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    if (!target || target.id === ctx.user.id || target.bot) return ctx.reply({ content: "Invalid target.", ephemeral: true } as any);
    const cdKey = `${ctx.guild.id}:${ctx.user.id}`;
    const last = cooldowns.get(cdKey) ?? 0;
    const remaining = 86400000 - (Date.now() - last);
    if (remaining > 0) {
      const h = Math.floor(remaining/3600000), m = Math.floor((remaining%3600000)/60000);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏳ You can rep again in **${h}h ${m}m**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    cooldowns.set(cdKey, Date.now());
    const repKey = `${ctx.guild.id}:${target.id}`;
    repMap.set(repKey, (repMap.get(repKey) ?? 0) + 1);
    const total = repMap.get(repKey)!;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("⭐ Rep Given").setDescription(`**${ctx.user.username}** gave a rep to **${target.username}**!\nThey now have **${total}** rep.`).setThumbnail(target.displayAvatarURL()).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
