import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "lockdown", aliases: ["serverlock"], description: "Lock or unlock all text channels in the server.", category: "moderation", permission: "admin", guildOnly: true,
  options: [{ name: "action", description: "lock or unlock", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "lock", value: "lock" }, { name: "unlock", value: "unlock" }] }],
  async execute(ctx) {
    if (!ctx.guild) return;
    await ctx.defer();
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "lock").toLowerCase();
    const locking = action === "lock";
    const everyone = ctx.guild.roles.everyone;
    const channels = ctx.guild.channels.cache.filter(c => c.isTextBased() && c.type !== 11 && c.type !== 12);
    let done = 0, failed = 0;
    for (const [, ch] of channels) {
      try { await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: locking ? false : null }); done++; }
      catch { failed++; }
    }
    return ctx.reply({ embeds: [successEmbed(`${locking ? "🔒 Locked" : "🔓 Unlocked"} **${done}** channels${failed ? `, failed on **${failed}**` : ""}.`)] });
  },
};
