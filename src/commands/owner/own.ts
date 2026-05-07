import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";
export const command: HybridCommand = {
  name: "own", description: "Owner control panel.", category: "owner", ownerOnly: true,
  aliases: ["panel","ownerpanel"],
  async execute(ctx) {
    if (ctx.user.id !== OID)
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription("⛔ **Access Denied.**").setTimestamp()] });
    await ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle("🔐 Identity Verification")
      .setDescription("```ansi\n\u001b[2;33m[  SCANNING  ] Analyzing biometric signature...\u001b[0m\n\u001b[2;33m[  SCANNING  ] Cross-referencing access database...\u001b[0m\n```")
      .setFooter({ text: "Mourn Security System" }).setTimestamp()] });
    await new Promise(r => setTimeout(r, 1500));
    await ctx.followUp({ embeds: [new EmbedBuilder().setColor(0x00ff88).setTitle("✅ Access Granted")
      .setDescription("```ansi\n\u001b[2;32m[ ✓ ] Biometric match ............. 100%\u001b[0m\n\u001b[2;32m[ ✓ ] Token signature ............. VALID\u001b[0m\n\u001b[2;32m[ ✓ ] Clearance level ............. OMEGA\u001b[0m\n\u001b[2;32m[ ✓ ] Two-factor override .......... BYPASSED\u001b[0m\n```")
      .setTimestamp()] });
    await new Promise(r => setTimeout(r, 1000));
    const up = Math.floor((ctx.client.uptime ?? 0) / 1000);
    const h = Math.floor(up/3600), m = Math.floor((up%3600)/60), s = up%60;
    return ctx.followUp({ embeds: [new EmbedBuilder().setColor(0x8b0000).setTitle("⚜️  G E I C O  —  Control Panel")
      .setDescription(["```","  ╔══════════════════════════════════╗","  ║   ⚠  CLASSIFIED ACCESS          ║","  ║   Authorization: OMEGA GRANTED   ║","  ╚══════════════════════════════════╝","```","",
        "**👑 Welcome back, Geico.** Full system control active.","",
        "**📊 Live Stats**",
        `> 🤖 **Bot:** ${ctx.client.user?.username ?? "Unknown"}`,
        `> 📡 **Servers:** ${ctx.client.guilds.cache.size.toLocaleString()}`,
        `> 👥 **Cached Users:** ${ctx.client.users.cache.size.toLocaleString()}`,
        `> ⚡ **Latency:** ${ctx.client.ws.ping}ms`,
        `> ⏱️ **Uptime:** ${h}h ${m}m ${s}s`,"",
        "**🛠️ Owner Commands**",
        "> `,eval` `,blacklist` `,broadcast` `,guilds`",
        "> `,maintenance` `,gnuke` `,lockuser` `,ghost`",
        "> `,setstatus` `,resetuser` `,ownerhelp` `,finduser`",
        "> `,guildlookup` `,botstats` `,ownerannounce` `,spy`",
      ].join("\n"))
      .setThumbnail(ctx.client.user?.displayAvatarURL() ?? null)
      .setFooter({ text: `${config.embedFooter} • Restricted — Eyes Only`, iconURL: ctx.user.displayAvatarURL() })
      .setTimestamp()] });
  },
};