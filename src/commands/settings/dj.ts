import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getMusicSettings, setMusicSettings } from "../../features/music.js";
import { resolveRole } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "dj",
  description: "Set or remove the DJ role required to use music commands.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "dj [role|off]",
  examples: ["dj @DJ", "dj off"],
  options: [{ name: "role", description: "Role or 'off' to remove", type: ApplicationCommandOptionType.Role, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const raw = ctx.getRole("role") ?? (ctx.args[0] ? resolveRole(ctx.guild, ctx.args[0]) : null);
    const off = !raw && (ctx.args[0]?.toLowerCase() === "off" || ctx.getString("role") === "off");
    const settings = await getMusicSettings(ctx.guild.id);
    if (!raw && !off) {
      const current = settings?.djRoleId ? `<@&${settings.djRoleId}>` : "not set (anyone can use music)";
      return ctx.reply({ embeds: [brandEmbed({ description: `dj role: ${current}` })] });
    }
    if (off) {
      await setMusicSettings(ctx.guild.id, { djRoleId: null });
      return ctx.reply({ embeds: [successEmbed("Dj **role** removed. anyone can now use music **commands**.")] });
    }
    await setMusicSettings(ctx.guild.id, { djRoleId: raw.id });
    return ctx.reply({ embeds: [successEmbed(`dj role set to <@&${raw.id}>.`)] });
  },
};
