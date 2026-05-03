import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
export const command: HybridCommand = {
  name: "voicerole", aliases: ["joinrole"], description: "Set a role to give when members join a voice channel.", category: "settings", permission: "admin", guildOnly: true,
  options: [{ name: "role", description: "Role to assign on voice join (leave empty to disable)", type: ApplicationCommandOptionType.Role, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole("role");
    await updateGuildSettings(ctx.guild.id, { voiceRoleId: role?.id ?? null } as any);
    return ctx.reply({ embeds: [successEmbed(role ? `Voice role set to <@&${role.id}>. Members will receive it when joining any voice channel.` : "Voice role **disabled**.")] });
  },
};
