import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const afkMap = new Map<string, { reason: string; since: number }>();

export const command: HybridCommand = {
  name: "afk",
  description: "Set your AFK status.",
  category: "utility",
  aliases: ["away"],
  options: [{ name: "reason", description: "AFK reason", type: ApplicationCommandOptionType.String, required: false }],
  async execute(ctx) {
    const reason = ctx.getString("reason") ?? ctx.args.join(" ") ?? "AFK";
    const key = `${ctx.guild?.id ?? "dm"}:${ctx.user.id}`;
    if (afkMap.has(key)) {
      const data = afkMap.get(key)!;
      afkMap.delete(key);
      const ago = Math.floor((Date.now() - data.since) / 1000);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Welcome back! You were AFK for ${ago}s.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    afkMap.set(key, { reason, since: Date.now() });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`💤 You are now AFK: **${reason}**`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
