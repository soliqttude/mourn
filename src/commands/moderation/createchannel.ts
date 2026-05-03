import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "createchannel", aliases: ["makechannel", "cc"], description: "Create a new text channel.", category: "moderation", permission: "admin", guildOnly: true,
  options: [
    { name: "name", description: "Channel name", type: ApplicationCommandOptionType.String, required: true },
    { name: "category", description: "Category name to put it in", type: ApplicationCommandOptionType.String, required: false },
    { name: "topic", description: "Channel topic", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name", true) ?? ctx.args[0] ?? "").toLowerCase().replace(/\s+/g, "-");
    const catName = ctx.getString("category") ?? ctx.args[1];
    const topic = ctx.getString("topic") ?? undefined;
    if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a channel name.")] });
    try {
      let parent: string | undefined;
      if (catName) {
        const cat = ctx.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes(catName.toLowerCase()));
        parent = cat?.id;
      }
      const ch = await ctx.guild.channels.create({ name, type: ChannelType.GuildText, topic, parent, reason: `Created by ${ctx.user.tag}` });
      return ctx.reply({ embeds: [successEmbed(`Created <#${ch.id}> (\`#${ch.name}\`)`)] });
    } catch (e) { return ctx.reply({ embeds: [errorEmbed((e as Error).message.slice(0, 200))] }); }
  },
};
