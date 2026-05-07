import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";
export const command: HybridCommand = {
  name: "ownerhelp", description: "(Owner) List all owner-only commands.", category: "owner", ownerOnly: true, aliases: ["ohelp"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b0000).setTitle("👑 Owner Commands — Full Reference")
      .setDescription("All commands restricted to **Geico** only.")
      .addFields(
        { name: "🔧 Bot Management", value: "`eval` `setstatus` `botrename` `botstats` `maintenance` `dbstats`" },
        { name: "👤 User Management", value: "`blacklist` `lockuser` `finduser` `expose` `spy` `resetuser` `ghost`" },
        { name: "🌐 Server Management", value: "`guilds` `guildlookup` `leaveserver` `gnuke` `wipeserver`" },
        { name: "📢 Announcements", value: "`broadcast` `ownerannounce` `ownersay` `ownerlog`" },
        { name: "⚙️ System", value: "`own` `ownerhelp` `customcommand` `resetuser`" },
      )
      .setFooter({ text: `${config.embedFooter} • Classified` }).setTimestamp()], ephemeral: true });
  },
};