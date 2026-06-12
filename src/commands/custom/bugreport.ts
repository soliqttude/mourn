import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "bugreport",
  description: "Report a bug with Mourn.",
  usage: "bugreport [description]",
  examples: ["bugreport"],
  category: "custom",
  aliases: ["bug"],
  options: [{ name: "description", description: "Describe the bug", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const desc = ctx.getString("description", true) ?? ctx.rawArgs;
    if (!desc) return;
    const owner = await ctx.client.users.fetch(config.ownerId).catch(() => null);
    if (owner) {
      await owner.send({
        embeds: [brandEmbed({
          title: "🐛 Bug Report",
          description: desc,
          user: ctx.user,
          fields: [
            { name: "Reporter", value: `${ctx.user.tag} (${ctx.user.id})`, inline: true },
            { name: "Server", value: ctx.guild?.name ?? "DM", inline: true },
          ],
          page: "Bug Report",
        })],
      }).catch(() => {});
    }
    return ctx.reply({ embeds: [successEmbed("Your bug report has been sent to the developer. Thank you!")] });
  },
};
