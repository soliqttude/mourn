import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "neverhaveiever",
  description: "Get a never have I ever question.",
  category: "fun",
  aliases: ["nhie", "neverhave"],
  
  async execute(ctx) {
    const questions = ["Never have I ever lied on my resume.","Never have I ever gone skinny dipping.","Never have I ever pretended to laugh at a joke I didn't get.","Never have I ever stalked someone on social media.","Never have I ever stayed up for more than 40 hours straight.","Never have I ever eaten food I dropped on the floor.","Never have I ever sent a text to the wrong person.","Never have I ever faked being busy to avoid someone.","Never have I ever cried at a movie.","Never have I ever blamed someone else for something I did."];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("🤚 Never Have I Ever").setDescription(questions[Math.floor(Math.random()*questions.length)]).setFooter({ text: "React 👍 if you have, 👎 if you haven't • " + config.embedFooter }).setTimestamp()] });
  },
};
