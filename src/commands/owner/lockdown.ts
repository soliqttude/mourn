import { EmbedBuilder, PermissionsBitField } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "lockdown",
  description: "(Owner) Lock all text channels in the server for @everyone.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["lock", "serverlockdown"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("🔒 Lockdown — Initiating")
          .setDescription("Locking all text channels...")
          .setFooter({ text: `${config.embedFooter} • Owner Action` }),
      ],
    });

    const channels = ctx.guild.channels.cache.filter(c => c.isTextBased());
    let locked = 0;
    for (const [, ch] of channels) {
      try {
        await (ch as any).permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
        locked++;
      } catch {}
    }

    return ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("🔒 Server Lockdown — Active")
          .setDescription(`Locked **${locked}** text channels.\n\nUse \`,unlockdown\` to lift the lockdown.`)
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
    });
  },
};
