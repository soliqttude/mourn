import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "say",
  aliases: ["echo", "announce"],
  description: "Make the bot send a message.",
  category: "utility",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "text", description: "What to say", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const text = ctx.getString("text", true);
    if (!text || !ctx.channel) return ctx.reply({ embeds: [errorEmbed("Nothing to say.")] });
    await ctx.channel.send({
      content: text.slice(0, 2000),
      allowedMentions: { parse: [] },
    });
    if (ctx.source === "prefix") {
      await (ctx.raw as any).delete().catch(() => {});
      return;
    }
    return ctx.reply({ embeds: [successEmbed("Sent.")], ephemeral: true });
  },
};
