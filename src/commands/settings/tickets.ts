import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "ticketsetup",
  description: "Configure the ticket system.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "category", description: "Tickets parent category", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "support_role", description: "Support role", type: ApplicationCommandOptionType.Role, required: true },
    { name: "log_channel", description: "Transcript log channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const category = ctx.getChannel("category", true) as any;
    const role = ctx.getRole("support_role");
    const logCh = ctx.getChannel("log_channel");
    if (!category || category.type !== ChannelType.GuildCategory) {
      return ctx.reply({ embeds: [errorEmbed("Category must be a server category.")] });
    }
    if (!role) return ctx.reply({ embeds: [errorEmbed("Support role required.")] });
    await updateGuildSettings(ctx.guild.id, {
      ticketCategory: category.id,
      ticketSupportRole: role.id,
      ticketLogChannel: logCh?.id ?? null,
    });
    return ctx.reply({
      embeds: [successEmbed("Tickets configured.")],
    });
  },
};
