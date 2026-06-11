import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "userhistory",
  description: "(Owner) Show all commands a user has run from the log.",
  usage: "userhistory [user_id]",
  examples: ["userhistory"],
  category: "owner",
  ownerOnly: true,
  aliases: ["cmdhistory", "userlogs"],
  options: [
    { name: "user_id", description: "User ID", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const userId = ctx.getString("user_id") ?? ctx.args[0];
    if (!userId) return ctx.reply({ embeds: [errorEmbed("Provide a **user** ID.")] });

    const entries = ownerState.commandLog.filter(e => e.userId === userId).slice(0, 30);
    if (!entries.length) return ctx.reply({ content: "No log entries for that user." });

    const user = await ctx.client.users.fetch(userId).catch(() => null);
    const lines = entries.map((e, i) =>
      `\`${String(i + 1).padStart(2)}\` \`${e.command}\` in **${e.guildName}** <t:${Math.floor(e.timestamp.getTime() / 1000)}:R>`
    );

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0f1923)
          .setTitle(`🕵️ Command History — ${user?.tag ?? userId}`)
          .setDescription(lines.join("\n"))
          .setFooter({ text: `${entries.length} of ${ownerState.commandLog.filter(e => e.userId === userId).length} total entries` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
