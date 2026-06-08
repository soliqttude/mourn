import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "hunt",
  description: "Go hunting for coins.",
  category: "economy",
  aliases: ["hunting"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 1_800_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastHunt");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`🏹 Hunt cooldown: **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    await setCooldown(ctx.guild.id, ctx.user.id, "lastHunt");
    const caught = Math.random() > 0.25;
    if (caught) {
      const animals = [["🐇 rabbit",50],["🦌 deer",120],["🐗 boar",90],["🦅 eagle",200],["🐻 bear",350],["🦊 fox",80]];
      const [name, base] = animals[Math.floor(Math.random()*animals.length)] as [string,number];
      const reward = base + Math.floor(Math.random()*60);
      await addBalance(ctx.guild.id, ctx.user.id, reward);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b4513).setTitle("🏹 Hunt").setDescription(`You hunted a **${name}** worth **${formatCoins(reward)}** coins!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } else {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x888888).setTitle("🏹 Missed").setDescription("Nothing was spotted. Better luck next time.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
