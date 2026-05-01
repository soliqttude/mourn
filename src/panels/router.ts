import {
  type Client,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} from "discord.js";
import { config } from "../config.js";
import { getGuildSettings, updateGuildSettings } from "../db/settings.js";
import { checkTier } from "../lib/permissions.js";

export type PanelTab =
  | "home"
  | "security"
  | "moderation"
  | "logs"
  | "welcome"
  | "economy"
  | "levels"
  | "tickets"
  | "owner";

const TAB_LABELS: Record<PanelTab, string> = {
  home: "🏠 Home",
  security: "🛡️ Security",
  moderation: "⚖️ Moderation",
  logs: "📜 Logs",
  welcome: "👋 Welcome",
  economy: "💰 Economy",
  levels: "🏆 Levels",
  tickets: "🎟️ Tickets",
  owner: "👑 Owner",
};

const TABS: PanelTab[] = [
  "home",
  "security",
  "moderation",
  "logs",
  "welcome",
  "economy",
  "levels",
  "tickets",
  "owner",
];

export function buildPanelRows(active: PanelTab) {
  const select = new StringSelectMenuBuilder()
    .setCustomId("panel:tab")
    .setPlaceholder(`Tab: ${TAB_LABELS[active]}`)
    .addOptions(
      TABS.map((t) => ({
        label: TAB_LABELS[t],
        value: t,
        default: t === active,
      }))
    );
  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  return [row1];
}

export async function buildPanelEmbed(active: PanelTab, guildId: string) {
  const s = await getGuildSettings(guildId);
  const eb = new EmbedBuilder()
    .setColor(config.brandColor)
    .setFooter({ text: `Mourn • Panel • ${TAB_LABELS[active]}` })
    .setTimestamp();

  if (active === "home") {
    eb.setTitle("Mourn Control Panel").setDescription(
      [
        "Pick a tab from the menu below to view its settings.",
        "",
        `**Prefix:** \`${s.prefix}\``,
        `**Anti-Nuke:** ${s.antinukeEnabled ? "✅" : "❌"}`,
        `**Anti-Raid:** ${s.antiraidEnabled ? "✅" : "❌"}`,
        `**Automod:** ${s.automodEnabled ? "✅" : "❌"}`,
        `**Welcome:** ${s.welcomeChannel ? `<#${s.welcomeChannel}>` : "off"}`,
        `**Goodbye:** ${s.goodbyeChannel ? `<#${s.goodbyeChannel}>` : "off"}`,
        `**Starboard:** ${s.starboardChannel ? `<#${s.starboardChannel}>` : "off"}`,
        `**Voicemaster:** ${s.voicemasterHub ? `<#${s.voicemasterHub}>` : "off"}`,
      ].join("\n")
    );
  } else if (active === "security") {
    eb.setTitle("Security").setDescription(
      [
        `**Anti-Nuke:** ${s.antinukeEnabled ? "✅" : "❌"} (action: ${s.antinukeAction})`,
        `**Anti-Raid:** ${s.antiraidEnabled ? "✅" : "❌"}`,
        `└ Threshold: ${s.antiraidThreshold} joins / 10s`,
        `└ Min account age: ${s.antiraidJoinAge} days`,
        "",
        "Use `/antinuke`, `/antiraid` to configure.",
      ].join("\n")
    );
  } else if (active === "moderation") {
    eb.setTitle("Moderation").setDescription(
      [
        `**Mute role:** ${s.muteRole ? `<@&${s.muteRole}>` : "—"}`,
        `**Jail role:** ${s.jailRole ? `<@&${s.jailRole}>` : "—"}`,
        `**Mod log:** ${s.modLogChannel ? `<#${s.modLogChannel}>` : "—"}`,
        "",
        "Available: `/ban`, `/kick`, `/timeout`, `/warn`, `/purge`, `/lock`, `/slowmode`.",
      ].join("\n")
    );
  } else if (active === "logs") {
    eb.setTitle("Logs").setDescription(
      [
        `**Mod log:** ${s.modLogChannel ? `<#${s.modLogChannel}>` : "—"}`,
        `**Message log:** ${s.msgLogChannel ? `<#${s.msgLogChannel}>` : "—"}`,
        `**Join log:** ${s.joinLogChannel ? `<#${s.joinLogChannel}>` : "—"}`,
        `**Voice log:** ${s.voiceLogChannel ? `<#${s.voiceLogChannel}>` : "—"}`,
        "",
        "Use `/setlog <type> <channel>` to configure.",
      ].join("\n")
    );
  } else if (active === "welcome") {
    eb.setTitle("Welcome / Goodbye / Boost").setDescription(
      [
        `**Welcome:** ${s.welcomeChannel ? `<#${s.welcomeChannel}>` : "—"}`,
        `**Goodbye:** ${s.goodbyeChannel ? `<#${s.goodbyeChannel}>` : "—"}`,
        `**Boost:** ${s.boostChannel ? `<#${s.boostChannel}>` : "—"}`,
        "",
        "Use `/setwelcome`, `/setgoodbye`, `/setboost`.",
      ].join("\n")
    );
  } else if (active === "economy") {
    eb.setTitle("Economy").setDescription(
      [
        "Members can use:",
        "`,balance` `,daily` `,work` `,deposit` `,withdraw` `,give` `,richest`",
      ].join("\n")
    );
  } else if (active === "levels") {
    eb.setTitle("Levels").setDescription(
      [
        `**Levels enabled:** ${s.levelsEnabled ? "✅" : "❌"}`,
        "",
        "Click a button below to toggle.",
      ].join("\n")
    );
  } else if (active === "tickets") {
    eb.setTitle("Tickets").setDescription(
      [
        `**Category:** ${s.ticketCategory ? `<#${s.ticketCategory}>` : "—"}`,
        `**Support role:** ${s.ticketSupportRole ? `<@&${s.ticketSupportRole}>` : "—"}`,
        `**Log:** ${s.ticketLogChannel ? `<#${s.ticketLogChannel}>` : "—"}`,
        "",
        "Use `/ticketsetup` to configure, `/ticketpanel` to deploy a panel.",
      ].join("\n")
    );
  } else if (active === "owner") {
    eb.setTitle("Owner Tools").setDescription(
      [
        "These are restricted to the bot owner.",
        "",
        "`/broadcast` — message every server",
        "`/blacklist` — block a user from using the bot",
        "`/customcommand` — make custom server commands",
      ].join("\n")
    );
  }
  return eb;
}

export function buildLevelsToggleRow(enabled: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel:levels:toggle")
      .setLabel(enabled ? "Disable Levels" : "Enable Levels")
      .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
  );
}

export async function buildPanel(active: PanelTab, guildId: string) {
  const eb = await buildPanelEmbed(active, guildId);
  const components: any[] = buildPanelRows(active);
  if (active === "levels") {
    const s = await getGuildSettings(guildId);
    components.push(buildLevelsToggleRow(s.levelsEnabled));
  }
  return { embeds: [eb], components };
}

export async function handlePanelInteraction(
  _client: Client,
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction
) {
  if (!interaction.guild || !interaction.member) {
    return interaction.reply({
      content: "Server only.",
      flags: MessageFlags.Ephemeral,
    });
  }
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member || !checkTier(member, "admin")) {
    return interaction.reply({
      content: "You need admin permission to use the panel.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "panel:tab") {
    const tab = interaction.values[0] as PanelTab;
    const payload = await buildPanel(tab, interaction.guild.id);
    return interaction.update(payload);
  }

  if (interaction.isButton() && interaction.customId === "panel:levels:toggle") {
    const s = await getGuildSettings(interaction.guild.id);
    await updateGuildSettings(interaction.guild.id, { levelsEnabled: !s.levelsEnabled });
    const payload = await buildPanel("levels", interaction.guild.id);
    return interaction.update(payload);
  }
}
