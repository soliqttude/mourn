import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setlanguage",
  description: "Set the bot language for this server.",
  category: "settings",
  aliases: ["language", "lang"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "language", description: "Language code (e.g. en, es, fr)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const lang = ctx.getString("language") ?? ctx.args[0];
    const supported = ["en","es","fr","de","pt","ja","ko","zh"];
    if (!lang || !supported.includes(lang.toLowerCase())) return ctx.reply({ content: `Supported languages: ${supported.join(", ")}`, ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { language: lang.toLowerCase() } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Language set to **${lang.toUpperCase()}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
