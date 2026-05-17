import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "ghostban",
  description: "(Owner) Ban a user silently with no DM and no visible reason.",
  usage: "ghostban [user] [reason]",
  examples: ["ghostban Rule violation"],
  category: "owner",
  ownerOnly: true,
  aliases: ["gban", "silentban", "shadowban"],
  options: [
    { name: "user", description: "User to ghost ban", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Internal reason (not shown)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return ctx.reply({ content: "Guild only." });

    const target = await ctx.getUser("user") ?? ctx.args[0];
    const userId = typeof target === "string" ? target.replace(/[<@!>]/g, "") : (target as any)?.id;
    const reason = ctx.getString("reason") ?? ctx.args[1] ?? "No reason provided.";

    if (!userId) return ctx.reply({ content: "Provide a user." });

    try {
      await ctx.guild.members.ban(userId, { reason: `[GHOST] ${reason}`, deleteMessageSeconds: 0 });
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8b0000)
            .setTitle("👻 Ghost Ban Executed")
            .addFields(
              { name: "User ID", value: userId, inline: true },
              { name: "Internal Reason", value: reason, inline: true },
              { name: "Visibility", value: "None — silent ban applied.", inline: false },
            )
            .setFooter({ text: `${config.embedFooter} • Owner Action` })
            .setTimestamp(),
        ],
        ephemeral: true,
      } as any);
    } catch (err: any) {
      return ctx.reply({ content: `Failed: ${err.message}` });
    }
  },
};
