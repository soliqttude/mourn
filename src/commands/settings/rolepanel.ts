import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getCategories } from "../../features/buttonRoles.js";

export const command: HybridCommand = {
  name: "reactionroles",
  aliases: ["rolepanel", "rp"],
  description: "Post the button role panel to a channel.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "channel", description: "Channel to post the role panel in", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel", true);
    if (!channel) return ctx.reply({ embeds: [errorEmbed("Channel is required.")] });

    const categories = await getCategories(ctx.guild.id);
    if (!categories.length) {
      return ctx.reply({ embeds: [errorEmbed("No categories set up yet. Use `,rcategory create <name>` first.")] });
    }

    const ch = ctx.guild.channels.cache.get(channel.id) as TextChannel | null;
    if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Invalid text channel.")] });

    for (const cat of categories) {
      if (!cat.roles.length) continue;

      const roleLines = cat.roles.map(r => `<@&${r}>`).join("\n");
      const embed = new EmbedBuilder()
        .setDescription(roleLines)
        .setColor(0x111116);

      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      const chunks = [];
      for (let i = 0; i < cat.roles.length; i += 5) {
        chunks.push(cat.roles.slice(i, i + 5));
      }

      for (const chunk of chunks) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (const roleId of chunk) {
          const roleObj = ctx.guild.roles.cache.get(roleId);
          const label = roleObj ? roleObj.name : roleId;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`role:${ctx.guild.id}:${roleId}`)
              .setLabel(label.slice(0, 80))
              .setStyle(ButtonStyle.Secondary)
          );
        }
        rows.push(row);
      }

      await ch.send({
        content: `( \`°□°\` ) · **${cat.name}**`,
        embeds: [embed],
        components: rows as any[],
      });
    }

    return ctx.reply({ embeds: [successEmbed(`Role panel posted in <#${channel.id}>.`)] });
  },
};
