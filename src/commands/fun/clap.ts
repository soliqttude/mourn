import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "clap",
  description: "Add 👏 between 👏 every 👏 word.",
  category: "fun",
  options: [{ name: "text", description: "Text to clapify", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return;
    const clapped = text.split(" ").join(" 👏 ");
    return ctx.reply({ embeds: [brandEmbed({ description: clapped, page: "Fun" })] });
  },
};
