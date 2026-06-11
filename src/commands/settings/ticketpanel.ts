import { ApplicationCommandOptionType, ChannelType, type TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { createTicketPanel, type TicketTopic } from "../../features/tickets.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "ticketpanel",
  description: "send a ticket panel to this channel",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "ticketpanel [title] [description]",
  examples: ["ticketpanel", "ticketpanel Support need help? open a ticket below"],
  options: [
    { name: "title", description: "panel title", type: ApplicationCommandOptionType.String, required: false },
    { name: "description", description: "panel description", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;

    const title = ctx.getString("title") ?? ctx.args[0] ?? "support";
    const desc =
      (ctx.getString("description") ?? ctx.args.slice(1).join(" ")) ||
      "click a button below to open a ticket.";

    const settings = await getGuildSettings(ctx.guild.id);

    // Auto-configure category from current channel's parent if not already set
    if (!settings.ticketCategory) {
      const parent = (ctx.channel as any).parentId ?? null;
      if (parent) {
        await updateGuildSettings(ctx.guild.id, { ticketCategory: parent });
      }
    }

    const topics = (Array.isArray((settings as any).ticketTopics) ? (settings as any).ticketTopics : []) as TicketTopic[];

    try {
      await createTicketPanel(ctx.channel as TextChannel, title, desc, topics);
      return ctx.reply({ embeds: [successEmbed("**Panel** sent.")], ephemeral: true });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
