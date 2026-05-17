import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "lockdown",
  aliases: ["serverlock"],
  description: "Toggle server lockdown on/off. Run once to lock all channels, again to unlock.",
  usage: "lockdown",
  examples: ["lockdown"],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    if (!ctx.guild) return;
    await ctx.defer();
    const everyone = ctx.guild.roles.everyone;
    const channels = ctx.guild.channels.cache.filter(c => c.isTextBased() && c.type !== 11 && c.type !== 12);

    const lockedCount = channels.filter(ch => {
      const overwrite = (ch as any).permissionOverwrites?.cache?.get(everyone.id);
      return overwrite?.deny?.has("SendMessages");
    }).size;

    const locking = lockedCount < channels.size / 2;

    let done = 0, failed = 0;
    for (const [, ch] of channels) {
      try {
        await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: locking ? false : null });
        done++;
      } catch {
        failed++;
      }
    }

    return ctx.reply({
      embeds: [successEmbed(`${locking ? "🔒 Locked" : "🔓 Unlocked"} **${done}** channels${failed ? `, failed on **${failed}**` : ""}.`)],
    });
  },
};
