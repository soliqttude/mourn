import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "tts",
  description: "Send a text-to-speech message in the current channel.",
  category: "utility",
  guildOnly: true,
  usage: "tts [message]",
  examples: ["tts Hello everyone!"],
  options: [{ name: "message", description: "Message to speak", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const message = ctx.getString("message", true)!;
    if (message.length > 200) return ctx.reply({ embeds: [errorEmbed("tts message must be 200 characters or less.")] });
    if (ctx.source === "slash") {
      await ctx.reply({ embeds: [successEmbed("sending tts message...")] });
    }
    await (ctx.channel as any).send({ content: message, tts: true }).catch(() => {});
    if (ctx.source === "prefix") await ctx.reply({ embeds: [successEmbed("tts message sent.")] });
  },
};
