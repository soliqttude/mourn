import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "inrole",
  aliases: ["roleusers", "membersinrole", "rolemembers"],
  description: "List all members who have a specific role.",
  category: "utility",
  guildOnly: true,
  options: [
    { name: "role", description: "Role to list members of", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ embeds: [errorEmbed("Please specify a role.")] });
    const members = guild.members.cache.filter((m) => m.roles.cache.has(role.id));
    if (!members.size) return ctx.reply({ embeds: [errorEmbed(`No members have <@&${role.id}>.`)] });
    const desc = members.map((m) => `<@${m.id}>`).join(" ");
    return ctx.reply({
      embeds: [brandEmbed({
        title: `Members with ${role.name} (${members.size})`,
        description: desc.slice(0, 4000),
        page: "Utility",
      })],
    });
  },
};
