import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "joke",
  description: "Get a random joke.",
  category: "fun",
  aliases: ["jk", "funfact"],
  
  async execute(ctx) {
    const jokes = ["Why don't scientists trust atoms? Because they make up everything!","I told my wife she was drawing her eyebrows too high. She looked surprised.","What do you call a fake noodle? An impasta!","Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them.","Why did the scarecrow win an award? Because he was outstanding in his field!","I asked my dog what two minus two is. He said nothing.","What do you call cheese that isn't yours? Nacho cheese.","Why can't you give Elsa a balloon? Because she'll let it go!","Parallel lines have so much in common. It's a shame they'll never meet.","I'm reading a book about anti-gravity. It's impossible to put down."];
    const joke = jokes[Math.floor(Math.random()*jokes.length)];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("😂 Joke").setDescription(joke).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
