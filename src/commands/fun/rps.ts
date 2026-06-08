import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "rps",
  description: "Play rock paper scissors.",
  category: "fun",
  aliases: ["rockpaperscissors"],
  options: [{ name: "choice", description: "rock, paper, or scissors", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const choice = (ctx.getString("choice") ?? ctx.args[0] ?? "").toLowerCase();
    const valid = ["rock","paper","scissors"];
    if (!valid.includes(choice)) return ctx.reply({ content: "Choose rock, paper, or scissors.", ephemeral: true } as any);
    const bot = valid[Math.floor(Math.random()*3)];
    const wins: Record<string,string> = { rock: "scissors", paper: "rock", scissors: "paper" };
    const emoji: Record<string,string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
    const result = choice === bot ? "tie" : wins[choice] === bot ? "win" : "lose";
    const colors: Record<string,number> = { win: 0x00e676, lose: 0xff4444, tie: 0xffd700 };
    const labels: Record<string,string> = { win: "You win!", lose: "Bot wins!", tie: "It's a tie!" };
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(colors[result]).setTitle(`${emoji[choice]} Rock Paper Scissors`).addFields({ name: "You", value: `${emoji[choice]} ${choice}`, inline: true },{ name: "Bot", value: `${emoji[bot]} ${bot}`, inline: true },{ name: "Result", value: labels[result], inline: false }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
