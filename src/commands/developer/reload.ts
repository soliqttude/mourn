import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "reload",
  description: "(Dev) Reload a command module.",
  category: "developer",
  aliases: ["reloadcmd"],
  ownerOnly: true,
  options: [{ name: "command", description: "Command to reload", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const name = ctx.getString("command") ?? ctx.args[0];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`🔄 Reload of **${name}** is not yet implemented at runtime. Restart the bot to reload commands.`).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
