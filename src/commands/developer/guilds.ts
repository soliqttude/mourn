import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "guilds",
  description: "(Dev) List guilds the bot is in.",
  category: "developer",
  aliases: ["servers", "guildlist"],
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const guilds = ctx.client.guilds.cache;
    const lines = guilds.map(g => `**${g.name}** (${g.id}) — ${g.memberCount} members`).slice(0, 20);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📋 Guilds (${guilds.size})`).setDescription(lines.join("\n") || "None.").setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
