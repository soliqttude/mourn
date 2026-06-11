import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setjailrole",
  description: "Set the role used by the jail command.",
  usage: "setjailrole [role]",
  examples: ["setjailrole"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "role", description: "The jail role", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ embeds: [errorEmbed("Please specify a **role**.")] });
    await updateGuildSettings(guild.id, { jailRole: role.id });
    return ctx.reply({ embeds: [successEmbed(`Jail role set to <@&${role.id}>.`)] });
  },
};
