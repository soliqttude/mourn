import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { commands } from "../../handlers/registry.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "ownerhelp",
  description: "(Owner) List all owner-only commands with full details.",
  category: "owner",
  ownerOnly: true,
  aliases: ["ohelp", "ocmds"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope.", ephemeral: true } as any);

    const ownerCmds = [...commands.values()].filter(c => c.ownerOnly);
    const byCat: Record<string, string[]> = {};
    for (const c of ownerCmds) {
      byCat[c.category] ??= [];
      const aliases = c.aliases?.length ? ` *(${c.aliases.map(a => `,${a}`).join(", ")})*` : "";
      byCat[c.category].push(`\`${c.name}\`${aliases} — ${c.description}`);
    }

    const fields = Object.entries(byCat).sort().map(([cat, list]) => ({
      name: `${cat} (${list.length})`,
      value: list.join("\n"),
    }));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle("👑 OWNER COMMAND REFERENCE — Full Index")
          .setDescription([
            `**${ownerCmds.length}** owner-only commands. Visible to you only.`,
            "",
            "These commands are hidden from all other users.",
          ].join("\n"))
          .addFields(fields)
          .setThumbnail(ctx.client.user?.displayAvatarURL() ?? null)
          .setFooter({ text: `${config.embedFooter} • Classified — Geico eyes only` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
