import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { formatRelative } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "roleinfo",
  aliases: ["ri"],
  description: "Show information about a role.",
  usage: "roleinfo [role]",
  examples: ["roleinfo"],
  category: "utility",
  guildOnly: true,
  options: [
    { name: "role", description: "Role", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ embeds: [errorEmbed("Role not found.")] });
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: role.name,
          fields: [
            { name: "ID", value: role.id, inline: true },
            { name: "Color", value: role.hexColor, inline: true },
            { name: "Position", value: String(role.position), inline: true },
            { name: "Members", value: String(role.members.size), inline: true },
            { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
            { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
            { name: "Created", value: formatRelative(role.createdAt) },
          ],
          page: "Roleinfo",
        }),
      ],
    });
  },
};
