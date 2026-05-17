import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addTag, listTags, removeTag } from "../../features/tags.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "customcommand",
  aliases: ["cc"],
  description: "(Owner only) Manage server custom commands (stored as tags).",
  usage: "customcommand [action] [name] [response]",
  examples: ["customcommand"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  options: [
    { name: "action", description: "add | remove | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "name", description: "Command name", type: ApplicationCommandOptionType.String, required: false },
    { name: "response", description: "Response text", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    if (ctx.user.id !== config.ownerId) return ctx.reply({ embeds: [errorEmbed("Owner only.")] });
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const name = ctx.getString("name");
    const response = ctx.getString("response");
    if (action === "list") {
      const all = await listTags(ctx.guild.id);
      return ctx.reply({
        embeds: [
          successEmbed(
            all.length ? all.map((t) => `\`${t.name}\``).join(" ") : "No custom commands."
          ),
        ],
      });
    }
    if (!name) return ctx.reply({ embeds: [errorEmbed("Name required.")] });
    if (action === "add") {
      if (!response) return ctx.reply({ embeds: [errorEmbed("Response required.")] });
      await addTag(ctx.guild.id, name, response, ctx.user.id);
      return ctx.reply({ embeds: [successEmbed(`Custom command \`${name}\` saved.`)] });
    }
    if (action === "remove") {
      const removed = await removeTag(ctx.guild.id, name);
      if (!removed) return ctx.reply({ embeds: [errorEmbed("Not found.")] });
      return ctx.reply({ embeds: [successEmbed(`Removed \`${name}\`.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("Unknown action.")] });
  },
};
