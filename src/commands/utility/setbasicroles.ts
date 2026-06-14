import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getCategories } from "../../features/buttonRoles.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "setbasicroles",
  aliases: ["basicroles", "rolespanel"],
  description: "Post all button-role panels to a channel with aesthetic spacing between each.",
  usage: "setbasicroles <#channel>",
  examples: ["setbasicroles #roles", "setbasicroles #self-roles"],
  category: "utility",
  permission: "manage_roles",
  guildOnly: true,
  options: [
    { name: "channel", description: "Channel to post the role panels in", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const channelArg = ctx.getChannel("channel");
    const ch = ctx.guild.channels.cache.get((channelArg as any)?.id ?? ctx.args[0]?.replace(/[<#>]/g, "")) as TextChannel | undefined;
    if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Please provide a valid text **channel**.")] });

    const categories = await getCategories(ctx.guild.id);
    const active = categories.filter(c => c.roles.length > 0);
    if (!active.length) return ctx.reply({ embeds: [errorEmbed("No **role** **categories** set up yet. use `,rcategory create <name>` first.")] });

    await ctx.reply({ embeds: [successEmbed(`posting ${active.length} role panel${active.length === 1 ? "" : "s"} to <#${ch.id}>…`)] });

    for (let i = 0; i < active.length; i++) {
      const cat = active[i]!;

      // ── Spacer between panels (skip before first) ─────────────────────────
      if (i > 0) {
        await ch.send({ content: "\u200b" });
      }

      // ── Build role description lines ──────────────────────────────────────
      const roleLines = cat.roles.map(roleId => {
        const role = ctx.guild!.roles.cache.get(roleId);
        return role ? `<@&${role.id}>` : `<@&${roleId}>`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setDescription(roleLines)
        .setColor(config.brandColor as any);

      // ── Build button rows (max 5 per row) ─────────────────────────────────
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let j = 0; j < cat.roles.length; j += 5) {
        const chunk = cat.roles.slice(j, j + 5);
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (const roleId of chunk) {
          const role = ctx.guild!.roles.cache.get(roleId);
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`role:${ctx.guild!.id}:${roleId}`)
              .setLabel((role?.name ?? roleId).slice(0, 80))
              .setStyle(ButtonStyle.Secondary),
          );
        }
        rows.push(row);
      }

      await ch.send({
        content: `**${cat.name}**`,
        embeds: [embed],
        components: rows as any[],
      });
    }
  },
};
