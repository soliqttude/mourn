import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const STORE = new Map<string, Map<string, string>>();

export const command: HybridCommand = {
  name: "cc",
  description: "Create a custom command.",
  category: "custom",
  aliases: ["customcommand", "addcc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "name", description: "Command name (trigger)", type: ApplicationCommandOptionType.String, required: true },
    { name: "response", description: "Bot response", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const response = ctx.getString("response") ?? ctx.args.slice(1).join(" ");
    if (!name || !response) return ctx.reply({ content: "Provide name and response.", ephemeral: true } as any);
    if (!STORE.has(ctx.guild.id)) STORE.set(ctx.guild.id, new Map());
    STORE.get(ctx.guild.id)!.set(name, response);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Custom Command Created").addFields({ name: "Trigger", value: `\`${name}\``, inline: true },{ name: "Response", value: response.slice(0,200), inline: false }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
