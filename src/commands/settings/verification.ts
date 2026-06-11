import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "verification",
  description: "Set up button verification for new members.",
  usage: "verification [channel] [role]",
  examples: ["verification"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  aliases: ["verify"],
  options: [
    { name: "channel", description: "Channel to send verification in", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "role", description: "Role to give on verify", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel");
    const role = ctx.getRole("role");
    if (!ch || !role) return ctx.reply({ embeds: [errorEmbed("Provide a **channel** and **role**.")] });
    const target = ctx.guild.channels.cache.get(ch.id);
    if (!target?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Invalid **channel**.")] });
    await updateGuildSettings(ctx.guild.id, { verificationChannel: ch.id, verificationRole: role.id } as any);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("verify_button").setLabel("✅ Verify").setStyle(ButtonStyle.Success),
    );
    await (target as any).send({
      embeds: [brandEmbed({ title: "Verification", description: "Click the button below to verify and gain access to the server.", page: "Verification" })],
      components: [row],
    });
    return ctx.reply({ embeds: [successEmbed(`Verification panel sent in <#${ch.id}>. Role: **${role.name}**.`)] });
  },
};
