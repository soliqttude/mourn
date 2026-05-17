import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { ownerState } from "../../lib/ownerState.js";

export const command: HybridCommand = {
  name: "lockuser",
  aliases: ["ulock"],
  description: "(Owner only) Lock or unlock a user from using bot commands globally.",
  usage: "lockuser [action] [user_id]",
  examples: ["lockuser"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "action", description: "lock | unlock | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "user_id", description: "User ID", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const userId = ctx.getString("user_id") ?? ctx.args[1];
    if (action === "list") {
      const list = [...ownerState.lockedUsers];
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.brandColor).setTitle("🔒 Locked Users").setDescription(list.length ? list.map(id => `\`${id}\``).join("\n") : "No locked users.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    if (!userId) return ctx.reply({ content: "Provide a user ID." });
    if (action === "lock") {
      ownerState.lockedUsers.add(userId);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setTitle("🔒 User Locked").setDescription(`\`${userId}\` is now locked out of all bot commands globally.`).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true });
    }
    if (action === "unlock") {
      ownerState.lockedUsers.delete(userId);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.successColor).setTitle("🔓 User Unlocked").setDescription(`\`${userId}\` can use bot commands again.`).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true });
    }
    return ctx.reply({ content: "Use `lock`, `unlock`, or `list`." });
  },
};
