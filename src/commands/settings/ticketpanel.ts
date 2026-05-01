import { ApplicationCommandOptionType, type TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { createTicketPanel } from "../../features/tickets.js";

export const command: HybridCommand = {
  name: "ticketpanel",
  description: "Send a ticket panel into the current channel.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "title", description: "Panel title", type: ApplicationCommandOptionType.String, required: false },
    { name: "description", description: "Panel description", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const title = ctx.getString("title") ?? "🎟️ Support";
    const desc = ctx.getString("description") ?? "Click the button below to open a ticket.";
    try {
      await createTicketPanel(ctx.channel as TextChannel, title, desc);
      return ctx.reply({ embeds: [successEmbed("Panel sent.")], ephemeral: true });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
