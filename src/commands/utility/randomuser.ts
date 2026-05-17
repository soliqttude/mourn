import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "randomuser",
  description: "Ping a completely random member in the server.",
  usage: "randomuser",
  examples: ["randomuser"],
  category: "utility",
  guildOnly: true,
  aliases: ["randommember", "spinpick", "pickarandom"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const members = await ctx.guild.members.fetch();
    const humans = members.filter(m => !m.user.bot);
    if (!humans.size) return ctx.reply({ content: "No human members found." });
    const picked = humans.at(Math.floor(Math.random() * humans.size))!;

    return ctx.reply({
      content: `🎲 The wheel has spoken... <@${picked.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle("🎲 Random Member")
          .setThumbnail(picked.user.displayAvatarURL())
          .addFields(
            { name: "Chosen One", value: `${picked.user.tag}`, inline: true },
            { name: "Joined", value: picked.joinedAt ? `<t:${Math.floor(picked.joinedAt.getTime() / 1000)}:R>` : "Unknown", inline: true },
            { name: "Roles", value: `${picked.roles.cache.size - 1}`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • Random from ${humans.size} members` })
          .setTimestamp(),
      ],
    });
  },
};
