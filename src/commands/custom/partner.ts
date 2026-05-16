import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "partner",
  description: "Apply to partner your server with Bleed.",
  category: "custom",
  guildOnly: true,
  options: [
    { name: "invite", description: "Your server invite link", type: ApplicationCommandOptionType.String, required: true },
    { name: "description", description: "Short description of your server", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const invite = ctx.getString("invite", true) ?? ctx.args[0];
    const desc = ctx.getString("description", true) ?? ctx.args.slice(1).join(" ");
    if (!invite || !desc) return;
    const owner = await ctx.client.users.fetch(config.ownerId).catch(() => null);
    if (owner) {
      await owner.send({
        embeds: [brandEmbed({
          title: "🤝 Partnership Request",
          description: desc,
          user: ctx.user,
          fields: [
            { name: "Server", value: `${ctx.guild.name} (${ctx.guild.id})`, inline: true },
            { name: "Members", value: String(ctx.guild.memberCount), inline: true },
            { name: "Invite", value: invite, inline: false },
          ],
          page: "Partner",
        })],
      }).catch(() => {});
    }
    return ctx.reply({ embeds: [successEmbed("Your partnership application has been sent! The developer will review it soon.")] });
  },
};
