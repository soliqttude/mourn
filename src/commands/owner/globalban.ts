import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "globalban",
  description: "(Owner) Ban a user from ALL servers the bot is in.",
  category: "owner",
  ownerOnly: true,
  aliases: ["banall"],
  options: [
    { name: "userid", description: "User ID to ban", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const userId = ctx.getString("userid") ?? ctx.args[0];
    const reason = ctx.getString("reason") ?? ctx.args[1] ?? "Global ban by bot owner.";
    if (!userId) return ctx.reply({ content: "Provide a user ID." });

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("⛔ Global Ban — Executing")
          .setDescription(`Banning \`${userId}\` from all ${ctx.client.guilds.cache.size} servers...`)
          .setFooter({ text: `${config.embedFooter} • Owner Action` }),
      ],
    });

    let success = 0, fail = 0;
    for (const [, guild] of ctx.client.guilds.cache) {
      try {
        await guild.members.ban(userId, { reason: `[GLOBAL BAN] ${reason}` });
        success++;
      } catch { fail++; }
    }

    return ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("⛔ Global Ban — Complete")
          .addFields(
            { name: "User ID", value: userId, inline: true },
            { name: "✅ Banned", value: `${success} servers`, inline: true },
            { name: "❌ Failed", value: `${fail} servers`, inline: true },
            { name: "Reason", value: reason },
          )
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
    });
  },
};
