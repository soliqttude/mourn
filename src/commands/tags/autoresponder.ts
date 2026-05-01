import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed } from "../../lib/embeds.js";
import {
  addAutoresponder,
  listAutoresponders,
  removeAutoresponder,
} from "../../features/autoresponders.js";

export const command: HybridCommand = {
  name: "autoresponder",
  aliases: ["ar"],
  description: "Manage autoresponders. Subcommands: add, remove, list.",
  category: "tags",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "action", description: "add | remove | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "trigger_or_id", description: "Trigger text (add) or ID (remove)", type: ApplicationCommandOptionType.String, required: false },
    { name: "response", description: "Response (for add)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const t = ctx.getString("trigger_or_id");
    const r = ctx.getString("response");

    if (action === "list") {
      const list = await listAutoresponders(ctx.guild.id);
      if (!list.length) return ctx.reply({ embeds: [errorEmbed("No autoresponders.")] });
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "Autoresponders",
            description: list
              .map(
                (a) =>
                  `**${a.id}** [${a.matchType}] \`${a.trigger}\` → ${a.response.slice(0, 80)}`
              )
              .join("\n"),
            page: "Autoresponders",
          }),
        ],
      });
    }

    if (action === "add") {
      if (!t || !r) return ctx.reply({ embeds: [errorEmbed("Trigger and response required.")] });
      await addAutoresponder(ctx.guild.id, t, r, "contains", ctx.user.id);
      return ctx.reply({ embeds: [successEmbed(`Autoresponder added for \`${t}\`.`)] });
    }

    if (action === "remove") {
      if (!t) return ctx.reply({ embeds: [errorEmbed("ID required.")] });
      const id = parseInt(t, 10);
      if (!Number.isFinite(id)) return ctx.reply({ embeds: [errorEmbed("Invalid ID.")] });
      const removed = await removeAutoresponder(id);
      if (!removed) return ctx.reply({ embeds: [errorEmbed("Not found.")] });
      return ctx.reply({ embeds: [successEmbed(`Removed autoresponder #${id}.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown action.")] });
  },
};
