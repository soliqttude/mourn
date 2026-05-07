import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "unlockdown",
  description: "(Owner) Lift the server lockdown and restore text channel access.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["unlock", "liftlockdown"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("🔓 Unlocking Channels...")
          .setFooter({ text: `${config.embedFooter} • Owner Action` }),
      ],
    });

    const channels = ctx.guild.channels.cache.filter(c => c.isTextBased());
    let unlocked = 0;
    for (const [, ch] of channels) {
      try {
        await (ch as any).permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null });
        unlocked++;
      } catch {}
    }

    return ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("🔓 Lockdown Lifted")
          .setDescription(`Restored **${unlocked}** text channels to normal access.`)
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
    });
  },
};
