import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "mine",
  description: "Go mining for coins.",
  category: "economy",
  aliases: ["mining"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 2_700_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastMine");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⛏️ Mine cooldown: **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    await setCooldown(ctx.guild.id, ctx.user.id, "lastMine");
    const ores = [["🪨 stone",10,0.5],["🥈 silver",80,0.25],["🥇 gold",200,0.15],["💎 diamond",500,0.07],["🔮 crystal",300,0.03]];
    let ore = ores[0];
    const r = Math.random();
    let acc = 0;
    for (const o of ores) { acc += o[2] as number; if (r < acc) { ore = o; break; } }
    const reward = (ore[1] as number) + Math.floor(Math.random() * 30);
    await addBalance(ctx.guild.id, ctx.user.id, reward);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xa0522d).setTitle("⛏️ Mining").setDescription(`You mined **${ore[0]}** worth **${formatCoins(reward)}** coins!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
