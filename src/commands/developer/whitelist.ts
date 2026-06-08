import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "whitelist",
  description: "(Dev) Whitelist a guild for testing features.",
  category: "developer",
  aliases: ["allowguild"],
  ownerOnly: true,
  options: [{ name: "guild_id", description: "Guild ID to whitelist", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id") ?? ctx.args[0];
    if (!guildId) return ctx.reply({ content: "Provide a guild ID.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Guild `+`${guildId}`+` has been whitelisted.`).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
