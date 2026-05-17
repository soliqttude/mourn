import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { giveRep, getRep } from "../../features/economy.js";
import { errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "rep",
  aliases: ["reputation", "giverep"],
  description: "Give reputation to a user once per day.",
  usage: "rep [user]",
  examples: ["rep"],
  category: "fun",
  guildOnly: true,
  options: [
    { name: "user", description: "User to rep", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't rep yourself.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("bots don't need rep.")] });

    const result = await giveRep(ctx.guild.id, ctx.user.id, target.id);
    if (!result.success) {
      return ctx.reply({ embeds: [errorEmbed(result.reason ?? "can't give rep right now.")] });
    }

    const recipientRep = await getRep(ctx.guild.id, target.id);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setDescription(`👏 you repped **${target.username}**! they now have **${recipientRep.repCount} rep**.`)
          .setFooter({ text: `${config.embedFooter} • you can give rep again tomorrow` })
          .setTimestamp(),
      ],
    });
  },
};
