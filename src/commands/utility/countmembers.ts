import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "countmembers",
  description: "Count how many members have a specific role.",
  category: "utility",
  guildOnly: true,
  aliases: ["rolecount", "membercount2", "cmembers"],
  options: [
    { name: "role", description: "The role to count", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const roleArg = ctx.getRole?.("role") ?? null;
    const roleId = (roleArg as any)?.id ?? ctx.args[0]?.replace(/[<@&>]/g, "");
    if (!roleId) return ctx.reply({ content: "Provide a role." });

    const role = await ctx.guild.roles.fetch(roleId).catch(() => null);
    if (!role) return ctx.reply({ content: "Role not found." });

    const members = await ctx.guild.members.fetch();
    const withRole = members.filter(m => m.roles.cache.has(role.id));
    const humans = withRole.filter(m => !m.user.bot);
    const bots = withRole.filter(m => m.user.bot);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(role.color || 0x8b0000)
          .setTitle(`👥 Role Count — ${role.name}`)
          .addFields(
            { name: "Total Members", value: `${withRole.size}`, inline: true },
            { name: "👤 Humans", value: `${humans.size}`, inline: true },
            { name: "🤖 Bots", value: `${bots.size}`, inline: true },
            { name: "📊 % of Server", value: `${((withRole.size / ctx.guild.memberCount) * 100).toFixed(1)}%`, inline: true },
            { name: "Color", value: role.hexColor, inline: true },
            { name: "Position", value: `#${role.position}`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • Role Info` })
          .setTimestamp(),
      ],
    });
  },
};
