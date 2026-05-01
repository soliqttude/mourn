import {
  type Client,
  type VoiceState,
  type ButtonInteraction,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { voicemasterChannels } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";

export async function handleVoiceStateUpdate(
  _client: Client,
  oldState: VoiceState,
  newState: VoiceState
) {
  const guild = newState.guild;
  const settings = await getGuildSettings(guild.id);

  if (settings.voicemasterHub && newState.channelId === settings.voicemasterHub) {
    const member = newState.member;
    if (!member) return;
    const created = await guild.channels.create({
      name: `${member.displayName}'s VC`,
      type: ChannelType.GuildVoice,
      parent: settings.voicemasterCategory ?? newState.channel?.parent ?? undefined,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.Connect,
          ],
        },
      ],
    });
    await db.insert(voicemasterChannels).values({
      channelId: created.id,
      guildId: guild.id,
      ownerId: member.id,
    });
    await member.voice.setChannel(created).catch(() => {});
  }

  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const rows = await db
      .select()
      .from(voicemasterChannels)
      .where(eq(voicemasterChannels.channelId, oldState.channelId));
    if (rows[0]) {
      const ch = guild.channels.cache.get(oldState.channelId) as VoiceChannel | undefined;
      if (ch && ch.type === ChannelType.GuildVoice && ch.members.size === 0) {
        await ch.delete().catch(() => {});
        await db
          .delete(voicemasterChannels)
          .where(eq(voicemasterChannels.channelId, oldState.channelId));
      }
    }
  }
}

export function vmPanelEmbed() {
  return new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle("🎙️ Voicemaster")
    .setDescription(
      [
        "Use the buttons below to manage your voice channel.",
        "",
        "🔒 Lock — restrict who can join",
        "🔓 Unlock — allow everyone again",
        "👁️ Hide / Show — toggle visibility",
        "✏️ Rename — set channel name",
        "👥 Limit — set user limit",
        "🚪 Claim — claim if owner left",
      ].join("\n")
    )
    .setFooter({ text: "Mourn • Voicemaster" });
}

export function vmPanelButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("vm:lock").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:unlock").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:hide").setEmoji("👁️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:rename").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:claim").setEmoji("🚪").setStyle(ButtonStyle.Primary)
  );
}

export async function handleVMButton(client: Client, interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) return;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member?.voice.channel) {
    return interaction.reply({
      content: "You need to be in a voicemaster channel to use this.",
      ephemeral: true,
    });
  }
  const vc = member.voice.channel;
  const rows = await db
    .select()
    .from(voicemasterChannels)
    .where(eq(voicemasterChannels.channelId, vc.id));
  const row = rows[0];
  const action = interaction.customId.split(":")[1];

  if (action === "claim") {
    if (!row) {
      return interaction.reply({ content: "This isn't a voicemaster channel.", ephemeral: true });
    }
    const ownerStillIn = vc.members.has(row.ownerId);
    if (ownerStillIn) {
      return interaction.reply({ content: "The owner is still in the channel.", ephemeral: true });
    }
    await db
      .update(voicemasterChannels)
      .set({ ownerId: interaction.user.id })
      .where(eq(voicemasterChannels.channelId, vc.id));
    return interaction.reply({ content: "✅ You now own this channel.", ephemeral: true });
  }

  if (!row || row.ownerId !== interaction.user.id) {
    return interaction.reply({
      content: "Only the channel owner can do that.",
      ephemeral: true,
    });
  }

  const everyone = interaction.guild.roles.everyone;
  if (action === "lock") {
    await vc.permissionOverwrites
      .edit(everyone, { Connect: false })
      .catch(() => {});
    return interaction.reply({ content: "🔒 Channel locked.", ephemeral: true });
  }
  if (action === "unlock") {
    await vc.permissionOverwrites
      .edit(everyone, { Connect: null })
      .catch(() => {});
    return interaction.reply({ content: "🔓 Channel unlocked.", ephemeral: true });
  }
  if (action === "hide") {
    await vc.permissionOverwrites
      .edit(everyone, { ViewChannel: false })
      .catch(() => {});
    return interaction.reply({ content: "👁️ Channel hidden.", ephemeral: true });
  }
  if (action === "rename") {
    return interaction.reply({
      content: "Use `,vmname <new name>` to rename your channel.",
      ephemeral: true,
    });
  }
}
