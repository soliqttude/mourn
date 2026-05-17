import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { setAfk } from "../../features/afk.js";

export const command: HybridCommand = {
  name: "afk",
  aliases: ["away", "brb"],
  description: "Mark yourself AFK.",
  usage: "afk [reason]",
  examples: ["afk Rule violation"],
  category: "utility",
  guildOnly: true,
  options: [
    { name: "reason", description: "AFK reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const reason = ctx.getString("reason") ?? "AFK";
    await setAfk(ctx.guild.id, ctx.user.id, reason);
    return ctx.reply({ embeds: [successEmbed(`You're now AFK: ${reason}`)] });
  },
};
