import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "createcategory", aliases: ["makecategory", "catcreate"], description: "Create a new channel category.", category: "moderation", permission: "manage_channels", guildOnly: true,
  options: [{ name: "name", description: "Category name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name", true) ?? ctx.args.join(" ")).trim();
    if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a **category** name.")] });
    try {
      const cat = await ctx.guild.channels.create({ name: name.toUpperCase(), type: ChannelType.GuildCategory, reason: `Created by ${ctx.user.tag}` });
      return ctx.reply({ embeds: [successEmbed(`Created category **${cat.name}**.`)] });
    } catch (e) { return ctx.reply({ embeds: [errorEmbed((e as Error).message.slice(0, 200))] }); }
  },
};
