import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { commands, findCommand } from "../../handlers/registry.js";

export const command: HybridCommand = {
  name: "help",
  aliases: ["h", "commands"],
  description: "Show all commands or info on one.",
  category: "utility",
  options: [
    { name: "command", description: "Specific command", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const target = ctx.getString("command");
    if (target) {
      const c = findCommand(target);
      if (!c) return ctx.reply({ embeds: [errorEmbed(`Unknown command: ${target}`)] });
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: `Command — ${c.name}`,
            description: c.description,
            fields: [
              { name: "Category", value: c.category, inline: true },
              { name: "Permission", value: c.permission ?? "everyone", inline: true },
              { name: "Aliases", value: c.aliases?.length ? c.aliases.join(", ") : "—", inline: true },
            ],
            page: "Help",
          }),
        ],
      });
    }
    const grouped: Record<string, string[]> = {};
    for (const c of commands.values()) {
      grouped[c.category] ??= [];
      grouped[c.category].push(`\`${c.name}\``);
    }
    const fields = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, cmds]) => ({
        name: `${cat} (${cmds.length})`,
        value: cmds.sort().join(" "),
      }));
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Mourn — Commands",
          description: `Prefix: \`${ctx.prefix}\` · Total: **${commands.size}**\nUse \`${ctx.prefix}help <command>\` for details.`,
          fields,
          page: "Help",
        }),
      ],
    });
  },
};
