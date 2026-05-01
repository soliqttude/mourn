import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addReactionRole, removeReactionRole } from "../../features/reactionRoles.js";

export const command: HybridCommand = {
  name: "reactionrole",
  aliases: ["rr"],
  description: "Manage reaction roles. Subcommands: add, remove.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "action", description: "add | remove", type: ApplicationCommandOptionType.String, required: true },
    { name: "message_id", description: "Message ID", type: ApplicationCommandOptionType.String, required: true },
    { name: "emoji", description: "Emoji (unicode)", type: ApplicationCommandOptionType.String, required: true },
    { name: "role", description: "Role (for add)", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const msgId = ctx.getString("message_id", true);
    const emoji = ctx.getString("emoji", true);
    const role = ctx.getRole("role");
    if (!msgId || !emoji) return;

    if (action === "remove") {
      await removeReactionRole(msgId, emoji);
      return ctx.reply({ embeds: [successEmbed(`Removed reaction role.`)] });
    }
    if (action !== "add") return ctx.reply({ embeds: [errorEmbed("Unknown action.")] });
    if (!role) return ctx.reply({ embeds: [errorEmbed("Role required for add.")] });

    const message = await ctx.channel.messages.fetch(msgId).catch(() => null);
    if (!message) return ctx.reply({ embeds: [errorEmbed("Message not found in this channel.")] });

    try {
      await message.react(emoji);
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Could not react with that emoji.")] });
    }
    await addReactionRole(ctx.guild.id, ctx.channel.id, msgId, emoji, role.id);
    return ctx.reply({
      embeds: [successEmbed(`Reaction role bound: ${emoji} → <@&${role.id}>`)],
    });
  },
};
