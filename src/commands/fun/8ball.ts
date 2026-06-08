import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "8ball",
  description: "Ask the magic 8-ball.",
  category: "fun",
  aliases: ["magicball", "oracle"],
  options: [{ name: "question", description: "Your question", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const question = ctx.getString("question") ?? ctx.args.join(" ");
    if (!question) return ctx.reply({ content: "Ask a question.", ephemeral: true } as any);
    const responses = ["It is certain.","It is decidedly so.","Without a doubt.","Yes, definitely.","You may rely on it.","As I see it, yes.","Most likely.","Outlook good.","Yes.","Signs point to yes.","Reply hazy, try again.","Ask again later.","Better not tell you now.","Cannot predict now.","Concentrate and ask again.","Don't count on it.","My reply is no.","My sources say no.","Outlook not so good.","Very doubtful."];
    const emoji = ["✅","❓","❌"][Math.floor(Math.random()*3)];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x800080).setTitle(`🎱 Magic 8-Ball`).addFields({ name: "Question", value: question },{ name: "Answer", value: `${emoji} ${responses[Math.floor(Math.random()*responses.length)]}` }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
