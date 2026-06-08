import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "rob",
  description: "Attempt to rob another user.",
  category: "economy",
  aliases: ["mug"],
  guildOnly: true,
  options: [
    { name: "user", description: "User to rob", type: ApplicationCommandOptionType.User, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 10_800_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastRob");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏳ Cooldown: **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    const target = await ctx.getUser("user");
    if (!target || target.id === ctx.user.id || target.bot) return ctx.reply({ content: "Invalid target.", ephemeral: true } as any);
    const targetEco = await getBalance(ctx.guild.id, target.id);
    if (targetEco.balance < 50) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`**${target.username}** is too broke to rob.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    await setCooldown(ctx.guild.id, ctx.user.id, "lastRob");
    const success = Math.random() > 0.5;
    if (success) {
      const stolen = Math.floor(targetEco.balance * (Math.random() * 0.3 + 0.1));
      await addBalance(ctx.guild.id, target.id, -stolen);
      await addBalance(ctx.guild.id, ctx.user.id, stolen);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("🦹 Rob Success").setDescription(`You robbed **${formatCoins(stolen)}** coins from ${target.username}!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } else {
      const fine = Math.floor(Math.random() * 200) + 100;
      const myEco = await getBalance(ctx.guild.id, ctx.user.id);
      const actual = Math.min(fine, myEco.balance);
      if (actual > 0) { await addBalance(ctx.guild.id, ctx.user.id, -actual); await addBalance(ctx.guild.id, target.id, actual); }
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🚔 Rob Failed").setDescription(`You failed and lost **${formatCoins(actual)}** coins to ${target.username}!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
