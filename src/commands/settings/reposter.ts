import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { reposterConfig } from "../../db/schema.js";
import { eq } from "drizzle-orm";

async function getConfig(guildId: string) {
  const [row] = await db.select().from(reposterConfig).where(eq(reposterConfig.guildId, guildId));
  return row ?? { guildId, prefixEnabled: true, suppressEmbeds: false, showEmbed: true, strictMode: false, deleteOriginal: false };
}

export const command: HybridCommand = {
  name: "reposter",
  description: "Auto-embed social media links posted in your server.",
  usage: "reposter <prefix|suppress|embed|strict|delete> <on|off>",
  examples: ["reposter prefix on", "reposter suppress off", "reposter delete on", "reposter embed on"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "prefix | suppress | embed | strict | delete | config", type: ApplicationCommandOptionType.String, required: true,
      choices: [
        { name: "prefix", value: "prefix" }, { name: "suppress", value: "suppress" },
        { name: "embed", value: "embed" }, { name: "strict", value: "strict" },
        { name: "delete", value: "delete" }, { name: "config", value: "config" },
      ] },
    { name: "option", description: "on | off", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const option = (ctx.getString("option") ?? ctx.args[1] ?? "").toLowerCase();
    const cfg = await getConfig(ctx.guild.id);

    if (sub === "config") {
      return ctx.reply({ embeds: [brandEmbed({
        title: "Reposter Config",
        fields: [
          { name: "prefix", value: cfg.prefixEnabled ? "on" : "off", inline: true },
          { name: "suppress embeds", value: cfg.suppressEmbeds ? "on" : "off", inline: true },
          { name: "show embed", value: cfg.showEmbed ? "on" : "off", inline: true },
          { name: "strict mode", value: cfg.strictMode ? "on" : "off", inline: true },
          { name: "delete original", value: cfg.deleteOriginal ? "on" : "off", inline: true },
        ],
      })] });
    }

    const on = option === "on" || option === "true" || option === "enable";
    const patch: Record<string, boolean> = {
      prefix: { prefixEnabled: on } as any,
      suppress: { suppressEmbeds: on } as any,
      embed: { showEmbed: on } as any,
      strict: { strictMode: on } as any,
      delete: { deleteOriginal: on } as any,
    }[sub] ?? {};

    if (!Object.keys(patch).length) return ctx.reply({ embeds: [errorEmbed("Unknown subcommand.")] });

    const keyMap: Record<string, keyof typeof cfg> = {
      prefix: "prefixEnabled", suppress: "suppressEmbeds", embed: "showEmbed", strict: "strictMode", delete: "deleteOriginal",
    };
    const patchKey = keyMap[sub]!;
    const updatePatch = { [patchKey]: on };

    await db.insert(reposterConfig).values({ ...cfg, guildId: ctx.guild.id, ...updatePatch } as any)
      .onConflictDoUpdate({ target: reposterConfig.guildId, set: updatePatch as any });

    return ctx.reply({ embeds: [successEmbed(`reposter **${sub}** set to **${on ? "on" : "off"}**.`)] });
  },
};
