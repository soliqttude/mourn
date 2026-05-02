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
    { name: "set", description: "Set the autorole for this server.", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "role", description: "The role to set as autorole", type: ApplicationCommandOptionType.Role, required: true }] } as any,
    { name: "give", description: "Give the autorole to a member.", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "user", description: "Member to give the role to", type: ApplicationCommandOptionType.User, required: true }] } as any,
    { name: "remove", description: "Remove the autorole from a member.", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "user", description: "Member to remove the role from", type: ApplicationCommandOptionType.User, required: true }] } as any,
    { name: "clear", description: "Clear the configured autorole.", type: ApplicationCommandOptionType.Subcommand } as any,
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const sub = ctx.getString("subcommand") ?? ctx.args[0];

    if (sub === "set") {
      const role = ctx.getRole("role");
      if (!role) return ctx.reply({ embeds: [errorEmbed("Role not found.")] });
      await updateGuildSettings(guild.id, { autoroleId: role.id });
      return ctx.reply({ embeds: [successEmbed(`Autorole set to <@&${role.id}>.`)] });
    }

    if (sub === "clear") {
      await updateGuildSettings(guild.id, { autoroleId: null });
      return ctx.reply({ embeds: [successEmbed("Autorole cleared.")] });
    }

    const settings = await getGuildSettings(guild.id);
    if (!settings.autoroleId) {
      return ctx.reply({ embeds: [errorEmbed("No autorole configured. Use `/autorole set` first.")] });
    }

    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    const role = guild.roles.cache.get(settings.autoroleId);
    if (!role) return ctx.reply({ embeds: [errorEmbed("The configured autorole no longer exists. Please reset it.")] });

    if (sub === "give") {
      if (target.roles.cache.has(role.id)) {
        return ctx.reply({ embeds: [errorEmbed(`${target.user.tag} already has the autorole.`)] });
      }
      await target.roles.add(role, `Autorole given by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Gave <@&${role.id}> to **${target.user.tag}**.`)] });
    }

    if (sub === "remove") {
      if (!target.roles.cache.has(role.id)) {
        return ctx.reply({ embeds: [errorEmbed(`${target.user.tag} doesn't have the autorole.`)] });
      }
      await target.roles.remove(role, `Autorole removed by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Removed <@&${role.id}> from **${target.user.tag}**.`)] });
    }

    return ctx.reply({ embeds: [brandEmbed({ title: "Autorole", description: `Current autorole: <@&${settings.autoroleId}>`, page: "Settings" })] });
  },
};
