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

export function vmInterfaceEmbed(guild: { name: string; iconURL: () => string | null }) {
  return new EmbedBuilder()
    .setColor(0x111116)
    .setAuthor({
      name: "VoiceMaster Interface",
      iconURL: guild.iconURL() ?? undefined,
    })
    .setDescription("Use the buttons below to control your voice channel.")
    .addFields({
      name: "Button Usage",
      value: [
        "🔒 — **Lock** the voice channel",
        "🔓 — **Unlock** the voice channel",
        "🔇 — **Ghost** the voice channel",
        "👁️ — **Reveal** the voice channel",
        "🎙️ — **Claim** the voice channel",
        "🔌 — **Disconnect** a member",
        "🎮 — **Start** an activity",
        "ℹ️ — **View** channel information",
        "➕ — **Increase** the user limit",
        "➖ — **Decrease** the user limit",
      ].join("\n"),
    });
}

export function vmInterfaceRows() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("vm:lock").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:unlock").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:ghost").setEmoji("🔇").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:reveal").setEmoji("👁️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:claim").setEmoji("🎙️").setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("vm:disconnect").setEmoji("🔌").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:start").setEmoji("🎮").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:view").setEmoji("ℹ️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:increase").setEmoji("➕").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:decrease").setEmoji("➖").setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2];
}

export function vmPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x111116)
    .setTitle("🎙️ VoiceMaster")
    .setDescription("Use the buttons below to manage your voice channel.")
    .addFields({
      name: "Button Usage",
      value: [
        "🔒 — **Lock** the voice channel",
        "🔓 — **Unlock** the voice channel",
        "🔇 — **Ghost** the voice channel",
        "👁️ — **Reveal** the voice channel",
        "🎙️ — **Claim** the voice channel",
        "🔌 — **Disconnect** a member",
        "🎮 — **Start** an activity",
        "ℹ️ — **View** channel information",
        "➕ — **Increase** the user limit",
        "➖ — **Decrease** the user limit",
      ].join("\n"),
    });
}

export function vmPanelButtons() {
  return vmInterfaceRows()[0]!;
}

export async function handleVMButton(_client: Client, interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) return;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!member?.voice.channel) {
    return interaction.reply({
      content: "You need to be in a voicemaster channel to use this.",
      ephemeral: true,
    });
  }

  const vc = member.voice.channel as VoiceChannel;
  const rows = await db
    .select()
    .from(voicemasterChannels)
    .where(eq(voicemasterChannels.channelId, vc.id));
  const row = rows[0];
  const action = interaction.customId.split(":")[1];
  const everyone = interaction.guild.roles.everyone;

  // ── Claim (no ownership needed) ────────────────────────────────────────────
  if (action === "claim") {
    if (!row) return interaction.reply({ content: "This isn't a voicemaster channel.", ephemeral: true });
    if (vc.members.has(row.ownerId)) {
      return interaction.reply({ content: "The owner is still in the channel.", ephemeral: true });
    }
    await db.update(voicemasterChannels).set({ ownerId: interaction.user.id })
      .where(eq(voicemasterChannels.channelId, vc.id));
    return interaction.reply({ content: "✅ You now own this channel.", ephemeral: true });
  }

  // ── View (no ownership needed) ─────────────────────────────────────────────
  if (action === "view") {
    const owner = row ? await interaction.guild.members.fetch(row.ownerId).catch(() => null) : null;
    const embed = new EmbedBuilder()
      .setColor(0x111116)
      .setTitle(`# ${vc.name}`)
      .addFields(
        { name: "Owner", value: owner ? `${owner}` : "Unknown", inline: true },
        { name: "Members", value: `${vc.members.size}${vc.userLimit ? `/${vc.userLimit}` : ""}`, inline: true },
        { name: "Bitrate", value: `${vc.bitrate / 1000}kbps`, inline: true },
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ── All other actions require ownership ────────────────────────────────────
  if (!row || row.ownerId !== interaction.user.id) {
    return interaction.reply({ content: "Only the channel owner can do that.", ephemeral: true });
  }

  if (action === "lock") {
    await vc.permissionOverwrites.edit(everyone, { Connect: false }).catch(() => {});
    return interaction.reply({ content: "🔒 Channel locked.", ephemeral: true });
  }

  if (action === "unlock") {
    await vc.permissionOverwrites.edit(everyone, { Connect: null }).catch(() => {});
    return interaction.reply({ content: "🔓 Channel unlocked.", ephemeral: true });
  }

  if (action === "ghost") {
    await vc.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => {});
    return interaction.reply({ content: "🔇 Channel hidden (ghosted).", ephemeral: true });
  }

  if (action === "reveal") {
    await vc.permissionOverwrites.edit(everyone, { ViewChannel: null }).catch(() => {});
    return interaction.reply({ content: "👁️ Channel revealed.", ephemeral: true });
  }

  if (action === "disconnect") {
    const others = [...vc.members.values()].filter(m => m.id !== interaction.user.id);
    if (!others.length) {
      return interaction.reply({ content: "No other members to disconnect.", ephemeral: true });
    }
    const list = others.map((m, i) => `\`${i + 1}.\` ${m.displayName}`).join("\n");
    return interaction.reply({
      content: `**Who do you want to disconnect?**\nUse \`,voicekick @member\` to kick:\n${list}`,
      ephemeral: true,
    });
  }

  if (action === "start") {
    return interaction.reply({
      content: `🎮 To start an activity, right-click your voice channel → **Activities** in Discord's native UI.`,
      ephemeral: true,
    });
  }

  if (action === "increase") {
    const current = vc.userLimit ?? 0;
    if (current >= 99) return interaction.reply({ content: "Already at max limit (99).", ephemeral: true });
    await vc.setUserLimit(current + 1).catch(() => {});
    return interaction.reply({ content: `➕ User limit set to **${current + 1}**.`, ephemeral: true });
  }

  if (action === "decrease") {
    const current = vc.userLimit ?? 0;
    if (current <= 0) return interaction.reply({ content: "Limit is already unlimited.", ephemeral: true });
    const next = Math.max(0, current - 1);
    await vc.setUserLimit(next).catch(() => {});
    return interaction.reply({ content: `➖ User limit set to **${next === 0 ? "unlimited" : next}**.`, ephemeral: true });
  }
}
