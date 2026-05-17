import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { pathToFileURL } from "url";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { commands, aliases } from "../../handlers/registry.js";
const OID = "177803210738630656";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATEGORY_DIRS = ["economy", "fun", "moderation", "utility", "settings", "owner", "giveaway", "levels", "tags", "custom"];

export const command: HybridCommand = {
  name: "reloadcmd",
  description: "(Owner) Hot-reload a single command without restarting.",
  usage: "reloadcmd [name]",
  examples: ["reloadcmd"],
  category: "owner",
  ownerOnly: true,
  aliases: ["reload", "reloadcommand"],
  options: [
    { name: "name", description: "Command name to reload", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    if (!name) return ctx.reply({ embeds: [errorEmbed("Provide a command name.")] });

    for (const cat of CATEGORY_DIRS) {
      const filePath = join(__dirname, "..", "..", "commands", cat, `${name}.ts`);
      const url = pathToFileURL(filePath).href + `?v=${Date.now()}`;
      try {
        const mod = await import(url);
        const cmd: HybridCommand | undefined = mod.command ?? mod.default;
        if (!cmd?.name || !cmd.execute) continue;
        commands.set(cmd.name.toLowerCase(), cmd);
        for (const alias of cmd.aliases ?? []) aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
        return ctx.reply({ embeds: [successEmbed(`✅ Reloaded **${cmd.name}** from \`commands/${cat}/${name}.ts\`.`)] });
      } catch { continue; }
    }
    return ctx.reply({ embeds: [errorEmbed(`Could not find or reload command \`${name}\`.`)] });
  },
};
