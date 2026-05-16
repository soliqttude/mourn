import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "review",
  description: "Leave a review or feedback for Bleed.",
  category: "custom",
  aliases: ["feedback"],
  options: [
    { name: "rating", description: "Rating 1-5", type: ApplicationCommandOptionType.Integer, required: true, choices: [{ name: "1 ⭐", value: 1 }, { name: "2 ⭐⭐", value: 2 }, { name: "3 ⭐⭐⭐", value: 3 }, { name: "4 ⭐⭐⭐⭐", value: 4 }, { name: "5 ⭐⭐⭐⭐⭐", value: 5 }] },
    { name: "comment", description: "Your feedback", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const rating = ctx.getNumber("rating", true) ?? parseInt(ctx.args[0]);
    const comment = ctx.getString("comment") ?? ctx.args.slice(1).join(" ");
    if (!rating) return;
    const stars = "⭐".repeat(rating);
    const owner = await ctx.client.users.fetch(config.ownerId).catch(() => null);
    if (owner) {
      await owner.send({
        embeds: [brandEmbed({
          title: `${stars} Review`,
          description: comment || "No comment left.",
          user: ctx.user,
          fields: [
            { name: "Rating", value: `${rating}/5 ${stars}`, inline: true },
            { name: "Server", value: ctx.guild?.name ?? "DM", inline: true },
          ],
          page: "Review",
        })],
      }).catch(() => {});
    }
    return ctx.reply({ embeds: [successEmbed(`Thank you for your **${rating}/5** review! ${stars}`)] });
  },
};
