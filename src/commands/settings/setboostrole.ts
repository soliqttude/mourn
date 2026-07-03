import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { updateGuildSettings, getGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setboostrole",
  aliases: ["boostrole", "boostautorole"],
  description: "Set a role that gets auto-assigned when someone boosts the server.",
  usage: "setboostrole <@role | none>",
  examples: ["setboostrole @Booster", "setboostrole none"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    {
      name: "role",
      description: "Role to assign on boost, or \'none\' to disable",
      type: ApplicationCommandOptionType.Role,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const roleArg = ctx.args[0]?.toLowerCase();

    // View current setting
    if (!roleArg && !ctx.getRole("role")) {
      const settings = await getGuildSettings(ctx.guild.id);
      const current = (settings as any).boostRoleId as string | null;
      if (!current) return ctx.reply({ embeds: [brandEmbed({ title: "Boost Role", description: "no boost role set. use `,setboostrole @role` to set one." })] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Boost Role", description: `current boost role: <@&${current}>` })] });
    }

    // Disable
    if (roleArg === "none" || roleArg === "off" || roleArg === "disable") {
      await updateGuildSettings(ctx.guild.id, { boostRoleId: null } as any);
      return ctx.reply({ embeds: [successEmbed("boost role disabled.", "settings")] });
    }

    // Set role
    const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(ctx.args[0]?.replace(/[<@&>]/g, "") ?? "");
    if (!role) return ctx.reply({ embeds: [errorEmbed("couldn\'t find that role. mention it or use \'none\' to disable.")] });
    if (role.managed) return ctx.reply({ embeds: [errorEmbed("can\'t use a bot-managed role.")] });

    await updateGuildSettings(ctx.guild.id, { boostRoleId: role.id } as any);
    return ctx.reply({ embeds: [successEmbed(`boost role set to <@&${role.id}>. members will get it automatically when they boost.`, "settings")] });
  },
};
