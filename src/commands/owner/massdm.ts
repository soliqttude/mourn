import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "massdm",
  description: "(Owner) DM all non-bot members in this server.",
  usage: "massdm [message]",
  examples: ["massdm"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  options: [
    { name: "message", description: "Message to send", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;

    const msg = ctx.getString("message") ?? ctx.rawArgs;
    if (!msg) return ctx.reply({ content: "Provide a message." });

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle("📨 Mass DM — Starting")
          .setDescription(`Sending to all human members in **${ctx.guild.name}**...`)
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
    });

    const members = await ctx.guild.members.fetch();
    const humans = members.filter(m => !m.user.bot && m.id !== ctx.user.id);
    let sent = 0, failed = 0;

    for (const [, member] of humans) {
      try {
        await member.send(msg);
        sent++;
      } catch {
        failed++;
      }
      if ((sent + failed) % 10 === 0) await new Promise(r => setTimeout(r, 500));
    }

    return ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(sent > 0 ? 0x00e676 : 0xff1744)
          .setTitle("📨 Mass DM — Complete")
          .addFields(
            { name: "✅ Sent", value: `${sent}`, inline: true },
            { name: "❌ Failed", value: `${failed}`, inline: true },
            { name: "Total", value: `${humans.size}`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
    });
  },
};
