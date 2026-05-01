import { ApplicationCommandOptionType, type TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "purge",
  aliases: ["clear"],
  description: "Bulk delete messages.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "amount", description: "Amount (1-100)", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    const amt = ctx.getNumber("amount", true);
    if (!amt || amt < 1 || amt > 100) {
      return ctx.reply({ embeds: [errorEmbed("Amount must be 1-100.")] });
    }
    if (!ctx.channel || !("bulkDelete" in ctx.channel)) {
      return ctx.reply({ embeds: [errorEmbed("Cannot purge here.")] });
    }
    try {
      if (ctx.source === "prefix") {
        await (ctx.raw as any).delete().catch(() => {});
      }
      const deleted = await (ctx.channel as TextChannel).bulkDelete(amt, true);
      return ctx.reply({
        embeds: [successEmbed(`Deleted **${deleted.size}** messages.`)],
        ephemeral: true,
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
