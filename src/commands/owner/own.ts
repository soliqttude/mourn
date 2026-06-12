import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { commands } from "../../handlers/registry.js";

export const command: HybridCommand = {
  name: "own",
  description: "Owner control panel.",
  usage: "own",
  examples: ["own"],
  category: "owner",
  ownerOnly: true,
  aliases: ["ownerpanel"],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) {
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1a0000)
            .setTitle("⛔  ACCESS DENIED")
            .setDescription(
              [
                "```ansi",
                "\u001b[2;31m[ ✗ ] Identity check ............ FAILED\u001b[0m",
                "\u001b[2;31m[ ✗ ] Authorization level ........ NONE\u001b[0m",
                "\u001b[2;31m[ ✗ ] Clearance verified ......... FALSE\u001b[0m",
                "```",
                "",
                "> This incident has been **logged**.",
              ].join("\n")
            )
            .setFooter({ text: `${config.embedFooter} • Unauthorized access attempt` })
            .setTimestamp(),
        ],
        ephemeral: true,
      } as any);
    }

    // ── Step 1: Scanning ─────────────────────────────────────────────────
    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1a1a2e)
          .setTitle("🔐  MOURN SECURITY SYSTEM")
          .setDescription(
            [
              "```ansi",
              "\u001b[2;34m[ … ] Initiating identity scan...\u001b[0m",
              "\u001b[2;34m[ … ] Reading biometric signature...\u001b[0m",
              "\u001b[2;34m[ … ] Cross-referencing classified registry...\u001b[0m",
              "\u001b[2;34m[ … ] Verifying clearance token...\u001b[0m",
              "```",
            ].join("\n")
          )
          .setFooter({ text: "Mourn Security Protocol v2 • Stand by…" })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);

    await new Promise(r => setTimeout(r, 1800));

    // ── Step 2: Access Granted ───────────────────────────────────────────
    await ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("✅  ACCESS GRANTED")
          .setDescription(
            [
              "```ansi",
              "\u001b[1;32m[ ✓ ] Biometric match ............. 100%\u001b[0m",
              "\u001b[1;32m[ ✓ ] Token signature ............. VALID\u001b[0m",
              "\u001b[1;32m[ ✓ ] Clearance level ............. ── OMEGA ──\u001b[0m",
              "\u001b[1;32m[ ✓ ] 2FA override ................ BYPASSED\u001b[0m",
              "\u001b[1;32m[ ✓ ] Session encrypted ........... AES-256\u001b[0m",
              "```",
              "",
              "> **Identity confirmed.** Welcome back.",
            ].join("\n")
          )
          .setFooter({ text: `${config.embedFooter} • Omega clearance active` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);

    await new Promise(r => setTimeout(r, 1200));

    // ── Step 3: Control Panel ────────────────────────────────────────────
    const up = Math.floor((ctx.client.uptime ?? 0) / 1000);
    const h = Math.floor(up / 3600);
    const m = Math.floor((up % 3600) / 60);
    const s = up % 60;

    // Dynamically pull all owner commands from registry
    const ownerCmds = [...commands.values()].filter(c => c.ownerOnly);
    const grouped: Record<string, string[]> = {};
    for (const c of ownerCmds) {
      grouped[c.category] ??= [];
      grouped[c.category].push(`\`${config.defaultPrefix}${c.name}\``);
    }
    const cmdLines = Object.entries(grouped)
      .sort()
      .flatMap(([, cmds]) => cmds.sort());

    // Split into rows of 5 for clean display
    const rows: string[] = [];
    for (let i = 0; i < cmdLines.length; i += 5) {
      rows.push(cmdLines.slice(i, i + 5).join("  "));
    }

    return ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setAuthor({
            name: `${ctx.user.username} — Omega Access`,
            iconURL: ctx.user.displayAvatarURL(),
          })
          .setTitle("⚜️  MOURN  —  Owner Control Panel")
          .setDescription(
            [
              "```",
              "  ╔════════════════════════════════════╗",
              "  ║  ⚠  CLASSIFIED  •  EYES ONLY  ⚠   ║",
              "  ║     Authorization: OMEGA GRANTED    ║",
              "  ╚════════════════════════════════════╝",
              "```",
            ].join("\n")
          )
          .addFields(
            {
              name: "📊  Live System Stats",
              value: [
                `> 🤖 **Bot:** ${ctx.client.user?.username ?? "Unknown"}`,
                `> 📡 **Servers:** ${ctx.client.guilds.cache.size.toLocaleString()}`,
                `> 👥 **Cached Users:** ${ctx.client.users.cache.size.toLocaleString()}`,
                `> ⚡ **Latency:** ${ctx.client.ws.ping}ms`,
                `> ⏱️ **Uptime:** ${h}h ${m}m ${s}s`,
              ].join("\n"),
              inline: false,
            },
            {
              name: `🛠️  Owner Commands  (${ownerCmds.length})`,
              value: rows.join("\n") || "None loaded.",
              inline: false,
            }
          )
          .setThumbnail(ctx.client.user?.displayAvatarURL() ?? null)
          .setFooter({
            text: `${config.embedFooter} • Restricted — Eyes Only`,
            iconURL: ctx.user.displayAvatarURL(),
          })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
