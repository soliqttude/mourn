import { ApplicationCommandOptionType, ChannelType, type TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { createTicketPanel, type TicketTopic } from "../../features/tickets.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "ticketpanel",
  description: "send a ticket panel to this channel",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "ticketpanel [title] [description]",
  examples: [
    "ticketpanel",
    "ticketpanel mourn support  need help with the bot? open a ticket below",
  ],
  options: [
    { name: "title",       description: "panel title (default: server name)",       type: ApplicationCommandOptionType.String, required: false },
    { name: "description", description: "panel description",                         type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;

    const title = ctx.getString("title") ?? ctx.args[0] ?? ctx.guild.name;
    const desc =
      (ctx.getString("description") ?? ctx.args.slice(1).join(" ")) ||
      "Select a category below that best matches your inquiry.\nOur team will get back to you as soon as possible.";

    const settings = await getGuildSettings(ctx.guild.id);

    if (!settings.ticketCategory) {
      const parent = (ctx.channel as any).parentId ?? null;
      if (parent) {
        await updateGuildSettings(ctx.guild.id, { ticketCategory: parent });
      } else {
        return ctx.reply({
          embeds: [errorEmbed("No **ticket category** configured. Run this command inside a categorized channel or set one with `,settings ticket category`.")],
          ephemeral: true,
        });
      }
    }

    const topics = (Array.isArray((settings as any).ticketTopics)
      ? (settings as any).ticketTopics
      : []) as TicketTopic[];

    try {
      await createTicketPanel(ctx.channel as TextChannel, title, desc, topics);
      return ctx.reply({ embeds: [successEmbed("**Panel** sent.")], ephemeral: true });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
