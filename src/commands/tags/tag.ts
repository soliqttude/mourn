import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed } from "../../lib/embeds.js";
import { addTag, listTags, removeTag, getTag } from "../../features/tags.js";
import { checkTier } from "../../lib/permissions.js";

export const command: HybridCommand = {
  name: "tag",
  description: "Manage and use server tags. Subcommands: add, remove, list, show.",
  usage: "tag [action] [name] [response]",
  examples: ["tag"],
  category: "tags",
  guildOnly: true,
  options: [
    { name: "action", description: "add | remove | list | show", type: ApplicationCommandOptionType.String, required: true },
    { name: "name", description: "Tag name", type: ApplicationCommandOptionType.String, required: false },
    { name: "response", description: "Response (for add)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const name = ctx.getString("name");
    const response = ctx.getString("response");

    if (action === "list") {
      const all = await listTags(ctx.guild.id);
      if (!all.length) return ctx.reply({ embeds: [errorEmbed("No tags yet.")] });
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "Tags",
            description: all.map((t) => `\`${t.name}\` — ${t.uses} uses`).join("\n"),
            page: "Tags",
          }),
        ],
      });
    }

    if (!name) return ctx.reply({ embeds: [errorEmbed("Tag name required.")] });

    if (action === "show") {
      const t = await getTag(ctx.guild.id, name);
      if (!t) return ctx.reply({ embeds: [errorEmbed("Tag not found.")] });
      return ctx.reply({ content: t.response, allowedMentions: { parse: [] } });
    }

    if (!ctx.member || !checkTier(ctx.member, "mod")) {
      return ctx.reply({ embeds: [errorEmbed("Only mods can add or remove tags.")] });
    }

    if (action === "add") {
      if (!response) return ctx.reply({ embeds: [errorEmbed("Response required.")] });
      await addTag(ctx.guild.id, name, response, ctx.user.id);
      return ctx.reply({ embeds: [successEmbed(`Tag \`${name}\` saved.`)] });
    }

    if (action === "remove" || action === "delete") {
      const removed = await removeTag(ctx.guild.id, name);
      if (!removed) return ctx.reply({ embeds: [errorEmbed("Tag not found.")] });
      return ctx.reply({ embeds: [successEmbed(`Tag \`${name}\` deleted.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown action. Use add | remove | list | show.")] });
  },
};
