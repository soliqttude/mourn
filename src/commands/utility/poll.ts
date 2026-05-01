import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "poll",
  description: "Create a yes/no poll.",
  category: "utility",
  guildOnly: true,
  options: [
    { name: "question", description: "Poll question", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const q = ctx.getString("question", true);
    if (!q || !ctx.channel) return ctx.reply({ embeds: [errorEmbed("Missing question.")] });
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle("📊 Poll")
      .setDescription(q)
      .setFooter({ text: `Poll by ${ctx.user.tag}` });
    const msg = await ctx.channel.send({ embeds: [eb] });
    await msg.react("👍").catch(() => {});
    await msg.react("👎").catch(() => {});
    if (ctx.source === "slash") {
      return ctx.reply({ embeds: [successEmbed("Poll created.")], ephemeral: true });
    }
    return;
  },
};
