import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "autorole",
  description: "Configure or assign the server autorole.",
  category: "settings",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "action", description: "set · give · remove · clear · status", type: ApplicationCommandOptionType.String, required: true },
    { name: "role", description: "Role to set as autorole (for set)", type: ApplicationCommandOptionType.Role, required: false },
    { name: "user", description: "Member to give/remove the role (for give/remove)", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "").toLowerCase();

    if (action === "set") {
      const role = ctx.getRole("role");
      if (!role) return ctx.reply({ embeds: [errorEmbed("Please specify a role.")] });
      await updateGuildSettings(guild.id, { autoroleId: role.id });
      return ctx.reply({ embeds: [successEmbed(`Autorole set to <@&${role.id}>.`)] });
    }

    if (action === "clear") {
      await updateGuildSettings(guild.id, { autoroleId: null });
      return ctx.reply({ embeds: [successEmbed("Autorole cleared.")] });
    }

    if (action === "status") {
      const settings = await getGuildSettings(guild.id);
      if (!settings.autoroleId) return ctx.reply({ embeds: [errorEmbed("No autorole configured.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Autorole", description: `Current autorole: <@&${settings.autoroleId}>`, page: "Settings" })] });
    }

    const settings = await getGuildSettings(guild.id);
    if (!settings.autoroleId) return ctx.reply({ embeds: [errorEmbed("No autorole configured. Use `/autorole set` first.")] });
    const target = await ctx.getMember("user");
    if (!target) return ctx.reply({ embeds: [errorEmbed("Please specify a member.")] });
    const role = guild.roles.cache.get(settings.autoroleId);
    if (!role) return ctx.reply({ embeds: [errorEmbed("The configured autorole no longer exists. Please reset it.")] });

    if (action === "give") {
      if (target.roles.cache.has(role.id)) return ctx.reply({ embeds: [errorEmbed(`${target.user.tag} already has the autorole.`)] });
      await target.roles.add(role, `Autorole given by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Gave <@&${role.id}> to **${target.user.tag}**.`)] });
    }

    if (action === "remove") {
      if (!target.roles.cache.has(role.id)) return ctx.reply({ embeds: [errorEmbed(`${target.user.tag} doesn't have the autorole.`)] });
      await target.roles.remove(role, `Autorole removed by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Removed <@&${role.id}> from **${target.user.tag}**.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Usage: `/autorole set/give/remove/clear/status`")] });
  },
};
