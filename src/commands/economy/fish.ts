import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "fish",
  description: "Go fishing for coins.",
  category: "economy",
  aliases: ["fishing"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 1_800_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastFish");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`🎣 No fish biting yet. Wait **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    await setCooldown(ctx.guild.id, ctx.user.id, "lastFish");
    const caught = Math.random() > 0.25;
    if (caught) {
      const fish = [["🐠 clownfish",60],["🐟 salmon",80],["🐡 pufferfish",40],["🦈 shark",300],["🐙 octopus",150],["🦐 shrimp",20]];
      const [name, base] = fish[Math.floor(Math.random()*fish.length)] as [string,number];
      const reward = base + Math.floor(Math.random()*50);
      await addBalance(ctx.guild.id, ctx.user.id, reward);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x0099ff).setTitle("🎣 Fishing").setDescription(`You caught a **${name}** worth **${formatCoins(reward)}** coins!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } else {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x888888).setTitle("🎣 No Luck").setDescription("You didn't catch anything this time.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
