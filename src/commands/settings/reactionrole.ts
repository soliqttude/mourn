import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addReactionRole, removeReactionRole } from "../../features/reactionRoles.js";
import { db } from "../../db/index.js";
import { reactionRoles, reactionRoleMessages } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "reactionrole",
  aliases: ["rr"],
  description: "Manage reaction roles. Subcommands: add, remove, removeall, reset, list.",
  usage: "reactionrole <add|remove|removeall|reset|list> <message link> <emoji> <role>",
  examples: ["reactionrole"],
  category: "settings",
  permission: "manage_roles",
  guildOnly: true,
  options: [
    { name: "action", description: "add | remove | removeall | reset | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "message_id", description: "Message link or message ID", type: ApplicationCommandOptionType.String, required: false },
    { name: "emoji", description: "Emoji (unicode)", type: ApplicationCommandOptionType.String, required: false },
    { name: "role", description: "Role (for add)", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    if (!config.databaseEnabled) return ctx.reply({ embeds: [errorEmbed("reactionrole requires the database to be enabled. Add DATABASE_URL to Render.")] });
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "").toLowerCase();
    if (action === "list") {
      const rows = await db.select().from(reactionRoles).where(eq(reactionRoles.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No reaction roles are configured.")] });
      return ctx.reply({ embeds: [successEmbed(rows.map((r, i) => "**#" + (i + 1) + "** " + r.emoji + " → <@&" + r.roleId + "> — <#" + r.channelId + ">/" + r.messageId).join("\n"))] });
    }
    const rawLink = ctx.getString("message_id") ?? ctx.args[1] ?? "";
    const linkMatch = rawLink.match(/\\/channels\\/(\\d+)\\/(\\d+)\\/(\\d+)/);
    const msgId = linkMatch?.[3] ?? rawLink;
    const channelId = linkMatch?.[2] ?? ctx.channel.id;
    const emoji = ctx.getString("emoji") ?? ctx.args[2] ?? "";
    const role = ctx.getRole("role");

    if (action === "reset") {
      const rows = await db.select().from(reactionRoles).where(eq(reactionRoles.guildId, ctx.guild.id));
      await db.delete(reactionRoles).where(eq(reactionRoles.guildId, ctx.guild.id));
      await db.delete(reactionRoleMessages).where(eq(reactionRoleMessages.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [successEmbed("Cleared " + rows.length + " reaction roles from this server.")] });
    }
    if (!msgId) return ctx.reply({ embeds: [errorEmbed("Provide a message link.")] });
    if (action === "removeall") {
      const rows = await db.select().from(reactionRoles).where(and(eq(reactionRoles.guildId, ctx.guild.id), eq(reactionRoles.messageId, msgId)));
      await db.delete(reactionRoles).where(eq(reactionRoles.messageId, msgId));
      await db.delete(reactionRoleMessages).where(eq(reactionRoleMessages.messageId, msgId));
      return ctx.reply({ embeds: [successEmbed("Removed " + rows.length + " reaction roles from the message.")] });
    }
    if (action === "remove") {
      if (!emoji) return ctx.reply({ embeds: [errorEmbed("Provide the reaction emoji.")] });
      await removeReactionRole(msgId, emoji);
      return ctx.reply({ embeds: [successEmbed("Removed reaction role.")] });
    }
    if (action !== "add") return ctx.reply({ embeds: [errorEmbed("Unknown action.")] });
    if (!role) return ctx.reply({ embeds: [errorEmbed("**Role** required for add.")] });

    const targetChannel = ctx.guild.channels.cache.get(channelId);
    if (!targetChannel?.isTextBased() || !("messages" in targetChannel)) return ctx.reply({ embeds: [errorEmbed("Message channel not found.")] });
    const message = await targetChannel.messages.fetch(msgId).catch(() => null);
    if (!message) return ctx.reply({ embeds: [errorEmbed("Message not found in this **channel**.")] });

    try {
      await message.react(emoji);
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Could not react with that **emoji**.")] });
    }
    await addReactionRole(ctx.guild.id, channelId, msgId, emoji, role.id);
    return ctx.reply({
      embeds: [successEmbed(`Reaction role bound: ${emoji} → <@&${role.id}>`)],
    });
  },
};
