import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "botlist",
  description: "Show all bots in this server.",
  category: "utility",
  guildOnly: true,
  aliases: ["bots2", "listbots", "showbots"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const members = await ctx.guild.members.fetch();
    const bots = members.filter(m => m.user.bot).sort((a, b) => a.user.username.localeCompare(b.user.username));

    if (!bots.size) return ctx.reply({ content: "No bots found in this server." });

    const chunks: string[][] = [[]];
    for (const [, bot] of bots) {
      const last = chunks[chunks.length - 1]!;
      const entry = `**${bot.user.username}** (\`${bot.id}\`)`;
      if (last.length >= 15) chunks.push([entry]);
      else last.push(entry);
    }

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle(`🤖 Bots in ${ctx.guild.name}`)
          .setDescription(chunks[0]!.join("\n") || "—")
          .addFields(
            bots.size > 15 ? [{ name: `+ ${bots.size - 15} more`, value: "Use member list to see all bots." }] : [],
          )
          .setFooter({ text: `${config.embedFooter} • ${bots.size} total bots` })
          .setTimestamp(),
      ],
    });
  },
};
