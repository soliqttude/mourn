import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

let confessionCount = 0;

export const command: HybridCommand = {
  name: "confession",
  description: "Post an anonymous confession to the channel.",
  category: "fun",
  guildOnly: true,
  aliases: ["confess", "anon"],
  options: [
    { name: "text", description: "Your confession (you are anonymous!)", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.channel) return;
    const text = ctx.getString("text") ?? ctx.rawArgs;
    if (!text?.trim()) return ctx.reply({ content: "You must provide a confession.", ephemeral: true } as any);
    if (text.length > 500) return ctx.reply({ content: "Keep it under 500 characters.", ephemeral: true } as any);

    confessionCount++;

    // Confirm to sender
    await ctx.reply({ content: "✅ Your confession has been posted anonymously!", ephemeral: true } as any);

    // Post to channel
    await ctx.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle(`🤫 Anonymous Confession #${confessionCount}`)
          .setDescription(`"${text}"`)
          .setFooter({ text: `${config.embedFooter} • Identity hidden` })
          .setTimestamp(),
      ],
    });
  },
};
