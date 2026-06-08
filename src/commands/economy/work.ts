import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "work",
  description: "Work to earn coins.",
  category: "economy",
  aliases: ["job", "earn"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 3_600_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastWork");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏳ You're tired. Rest for **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    const jobs = ["wrote code","delivered packages","flipped burgers","fixed servers","walked dogs","tutored students","drove for a rideshare"];
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const reward = Math.floor(Math.random() * 200) + 50;
    await addBalance(ctx.guild.id, ctx.user.id, reward);
    await setCooldown(ctx.guild.id, ctx.user.id, "lastWork");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("💼 Work").setDescription(`You **${job}** and earned **${formatCoins(reward)}** coins!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
