import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "wipebal",
  description: "(Owner) Wipe the wallet balance of a user (not bank).",
  usage: "wipebal [user]",
  examples: ["wipebal"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["wipemoney", "nukemoney"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = await ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    if (!userId) return ctx.reply({ content: "Provide a user." });

    // Import economy
    const { getBalance, removeBalance } = await import("../../features/economy.js");
    const bal = await getBalance(ctx.guild.id, userId);
    if (bal.balance > 0) await removeBalance(ctx.guild.id, userId, bal.balance);

    const user = await ctx.client.users.fetch(userId).catch(() => null);
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("💸 Balance Wiped")
          .addFields(
            { name: "User", value: user?.tag ?? userId, inline: true },
            { name: "Wiped", value: `${bal.balance} coins`, inline: true },
            { name: "Bank", value: `${bal.bank} coins (untouched)`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
