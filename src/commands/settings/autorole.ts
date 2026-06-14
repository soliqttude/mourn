import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "autorole",
  description: "Set/clear the autorole. ,autorole @role | ,autorole clear | ,autorole give/remove @user",
  usage: "autorole [role] [action] [user]",
  examples: ["autorole"],
  category: "settings",
  permission: "manage_roles",
  guildOnly: true,
  options: [
    { name: "role", description: "Role to set as autorole (skip to view/clear)", type: ApplicationCommandOptionType.Role, required: false },
    { name: "action", description: "give | remove | clear", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "Member for give/remove", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const actionArg = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const role = ctx.getRole("role");
    const settings = await getGuildSettings(guild.id);

    // ,autorole clear
    if (actionArg === "clear") {
      await updateGuildSettings(guild.id, { autoroleId: null });
      return ctx.reply({ embeds: [successEmbed("Autorole cleared.")] });
    }

    // ,autorole give/remove @user
    if (actionArg === "give" || actionArg === "remove") {
      if (!settings.autoroleId) return ctx.reply({ embeds: [errorEmbed("No autorole configured. Use `,autorole @role` first.")] });
      const target = await ctx.getMember("user");
      if (!target) return ctx.reply({ embeds: [errorEmbed("Please mention a **member**.")] });
      const ar = guild.roles.cache.get(settings.autoroleId);
      if (!ar) return ctx.reply({ embeds: [errorEmbed("Configured autorole no longer exists. Reset it with `,autorole @role`.")] });
      if (actionArg === "give") {
        await target.roles.add(ar);
        return ctx.reply({ embeds: [successEmbed(`Gave <@&${ar.id}> to **${target.user.tag}**.`)] });
      }
      await target.roles.remove(ar);
      return ctx.reply({ embeds: [successEmbed(`Removed <@&${ar.id}> from **${target.user.tag}**.`)] });
    }

    // ,autorole @role — set it
    if (role) {
      await updateGuildSettings(guild.id, { autoroleId: role.id });
      return ctx.reply({ embeds: [successEmbed(`Autorole set to <@&${role.id}>. New members will automatically receive this role.`)] });
    }

    // ,autorole — view current
    if (settings.autoroleId) {
      return ctx.reply({ embeds: [brandEmbed({ title: "Autorole", description: `Current autorole: <@&${settings.autoroleId}>\nRun \`,autorole @role\` to change or \`,autorole clear\` to remove it.`, page: "Settings" })] });
    }
    return ctx.reply({ embeds: [brandEmbed({ title: "Autorole", description: "No autorole set. Run `,autorole @role` to configure one.", page: "Settings" })] });
  },
};
