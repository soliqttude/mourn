import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { commands } from "../../handlers/registry.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

function chunkFields(cat: string, lines: string[]): { name: string; value: string }[] {
  const chunks: { name: string; value: string }[] = [];
  let current: string[] = [];
  let currentLen = 0;
  let part = 1;
  for (const line of lines) {
    if (currentLen + line.length + 1 > 1000 && current.length > 0) {
      chunks.push({ name: `${cat}${part > 1 ? " (cont.)" : ""} (${current.length})`, value: current.join("\n") });
      current = [];
      currentLen = 0;
      part++;
    }
    current.push(line);
    currentLen += line.length + 1;
  }
  if (current.length > 0) {
    chunks.push({ name: `${cat}${part > 1 ? " (cont.)" : ""} (${current.length})`, value: current.join("\n") });
  }
  return chunks;
}

export const command: HybridCommand = {
  name: "ownerhelp",
  description: "(Owner) List all owner-only commands with full details.",
  usage: "ownerhelp",
  examples: ["ownerhelp"],
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

    const allFields = Object.entries(byCat).sort().flatMap(([cat, list]) => chunkFields(cat, list));

    const PAGE_SIZE = 20;
    const pages: typeof allFields[] = [];
    for (let i = 0; i < allFields.length; i += PAGE_SIZE) {
      pages.push(allFields.slice(i, i + PAGE_SIZE));
    }

    const embeds = pages.map((fields, idx) =>
      new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle(idx === 0 ? "👑 OWNER COMMAND REFERENCE — Full Index" : `👑 OWNER COMMANDS — Page ${idx + 1}`)
        .setDescription(idx === 0 ? `**${ownerCmds.length}** owner-only commands — hidden from all other users.` : null)
        .addFields(fields)
        .setThumbnail(idx === 0 ? (ctx.client.user?.displayAvatarURL() ?? null) : null)
        .setFooter({ text: `${config.embedFooter} • Classified${pages.length > 1 ? ` • Page ${idx + 1}/${pages.length}` : ""}` })
        .setTimestamp()
    );

    return ctx.reply({ embeds: embeds.slice(0, 10), ephemeral: true } as any);
  },
};
