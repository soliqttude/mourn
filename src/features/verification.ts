import type { Client, ButtonInteraction } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { successEmbed, errorEmbed } from "../lib/embeds.js";
import { MessageFlags } from "discord.js";

export async function handleVerificationButton(client: Client, interaction: ButtonInteraction) {
  if (!interaction.guild) return;
  const settings = await getGuildSettings(interaction.guild.id);
  const roleId = settings.verificationRole;
  if (!roleId) {
    return interaction.reply({ embeds: [errorEmbed("Verification role not configured.")], flags: MessageFlags.Ephemeral });
  }
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return;
  if (member.roles.cache.has(roleId)) {
    return interaction.reply({ embeds: [errorEmbed("You are already verified.")], flags: MessageFlags.Ephemeral });
  }
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.reply({ embeds: [errorEmbed("Verification role not found.")], flags: MessageFlags.Ephemeral });
  }
  await member.roles.add(role);
  return interaction.reply({ embeds: [successEmbed("You are now verified! Welcome.")], flags: MessageFlags.Ephemeral });
}
