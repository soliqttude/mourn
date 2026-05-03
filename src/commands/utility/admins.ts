import { PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "admins",
  description: "List all members with administrator permissions.",
  category: "utility",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const admins = guild.members.cache.filter(
      (m) => !m.user.bot && m.permissions.has(PermissionFlagsBits.Administrator)
    );
    if (!admins.size) return ctx.reply({ embeds: [errorEmbed("No admins found.")] });
    const desc = admins.map((m) => `<@${m.id}> — ${m.user.tag}`).join("\n");
    return ctx.reply({
      embeds: [brandEmbed({
        title: `Server Admins (${admins.size})`,
        description: desc.slice(0, 4000),
        page: "Utility",
      })],
    });
  },
};
