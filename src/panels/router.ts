import {
  type Client,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
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

// ── Presentation ─────────────────────────────────────────────────────────
// Monochrome glyphs only — no color emoji. Keeps the panel feeling like a
// single designed surface instead of a row of mismatched icons.
const ON = "◆ Active";
const OFF = "◇ Inactive";
const status = (enabled: boolean) => (enabled ? ON : OFF);
const channelOrDash = (id: string | null | undefined) => (id ? `<#${id}>` : "—");
const roleOrDash = (id: string | null | undefined) => (id ? `<@&${id}>` : "—");

const TAB_META: Record<PanelTab, { label: string; blurb: string }> = {
  home: { label: "Home", blurb: "Overview & quick status" },
  security: { label: "Security", blurb: "Anti-nuke & anti-raid" },
  moderation: { label: "Moderation", blurb: "Mute, jail, mod log" },
  logs: { label: "Logs", blurb: "Audit & event logging" },
  welcome: { label: "Welcome", blurb: "Welcome, goodbye, boost" },
  economy: { label: "Economy", blurb: "Currency & economy commands" },
  levels: { label: "Levels", blurb: "XP & leveling system" },
  tickets: { label: "Tickets", blurb: "Support ticket system" },
  owner: { label: "Owner", blurb: "Bot owner utilities" },
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

export function buildPanelRows(
  active: PanelTab
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const select = new StringSelectMenuBuilder()
    .setCustomId("panel:tab")
    .setPlaceholder(`⎯ ${TAB_META[active].label} ⎯`)
    .addOptions(
      TABS.map((t) => ({
        label: TAB_META[t].label,
        description: TAB_META[t].blurb,
        value: t,
        default: t === active,
      }))
    );
  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)];
}

export async function buildPanelEmbed(active: PanelTab, guildId: string) {
  const s = await getGuildSettings(guildId);
  const eb = new EmbedBuilder()
    .setColor(config.brandColor)
    .setAuthor({ name: "MOURN" })
    .setFooter({ text: `Panel · ${TAB_META[active].label}` })
    .setTimestamp();

  if (active === "home") {
    eb.setDescription("*A refined command centre for your server.*").addFields(
      { name: "Prefix", value: `\`${s.prefix}\``, inline: true },
      { name: "Anti-Nuke", value: status(s.antinukeEnabled), inline: true },
      { name: "Anti-Raid", value: status(s.antiraidEnabled), inline: true },
      { name: "Automod", value: status(s.automodEnabled), inline: true },
      { name: "Welcome", value: channelOrDash(s.welcomeChannel), inline: true },
      { name: "Goodbye", value: channelOrDash(s.goodbyeChannel), inline: true },
      { name: "Starboard", value: channelOrDash(s.starboardChannel), inline: true },
      { name: "Voicemaster", value: channelOrDash(s.voicemasterHub), inline: true }
    );
  } else if (active === "security") {
    eb.setDescription("*Guardrails against nukes, raids, and abuse.*").addFields(
      { name: "Anti-Nuke", value: `${status(s.antinukeEnabled)} · action: ${s.antinukeAction}` },
      { name: "Anti-Raid", value: status(s.antiraidEnabled) },
      { name: "Join Threshold", value: `${s.antiraidThreshold} joins / 10s`, inline: true },
      { name: "Minimum Account Age", value: `${s.antiraidJoinAge} days`, inline: true },
      { name: "Configure", value: "`/antinuke` · `/antiraid`" }
    );
  } else if (active === "moderation") {
    eb.setDescription("*Tools for keeping order.*").addFields(
      { name: "Mute Role", value: roleOrDash(s.muteRole), inline: true },
      { name: "Jail Role", value: roleOrDash(s.jailRole), inline: true },
      { name: "Mod Log", value: channelOrDash(s.modLogChannel), inline: true },
      {
        name: "Commands",
        value: "`/ban` · `/kick` · `/timeout` · `/warn` · `/purge` · `/lock` · `/slowmode`",
      }
    );
  } else if (active === "logs") {
    eb.setDescription("*A record of everything that happens here.*").addFields(
      { name: "Mod Log", value: channelOrDash(s.modLogChannel), inline: true },
      { name: "Message Log", value: channelOrDash(s.msgLogChannel), inline: true },
      { name: "Join Log", value: channelOrDash(s.joinLogChannel), inline: true },
      { name: "Voice Log", value: channelOrDash(s.voiceLogChannel), inline: true },
      { name: "Configure", value: "`/setlog <type> <channel>`" }
    );
  } else if (active === "welcome") {
    eb.setDescription("*First and last impressions.*").addFields(
      { name: "Welcome", value: channelOrDash(s.welcomeChannel), inline: true },
      { name: "Goodbye", value: channelOrDash(s.goodbyeChannel), inline: true },
      { name: "Boost", value: channelOrDash(s.boostChannel), inline: true },
      { name: "Configure", value: "`/setwelcome` · `/setgoodbye` · `/setboost`" }
    );
  } else if (active === "economy") {
    eb.setDescription("*A currency system for your members.*").addFields({
      name: "Commands",
      value: [
        `\`${s.prefix}balance\``,
        `\`${s.prefix}daily\``,
        `\`${s.prefix}work\``,
        `\`${s.prefix}deposit\``,
        `\`${s.prefix}withdraw\``,
        `\`${s.prefix}give\``,
        `\`${s.prefix}richest\``,
      ].join(" · "),
    });
  } else if (active === "levels") {
    eb.setDescription("*Reward activity with experience and rank.*").addFields({
      name: "Levels",
      value: status(s.levelsEnabled),
    });
  } else if (active === "tickets") {
    eb.setDescription("*Give members a direct line to your team.*").addFields(
      { name: "Category", value: channelOrDash(s.ticketCategory), inline: true },
      { name: "Support Role", value: roleOrDash(s.ticketSupportRole), inline: true },
      { name: "Log", value: channelOrDash(s.ticketLogChannel), inline: true },
      { name: "Configure", value: "`/ticketsetup` · `/ticketpanel`" }
    );
  } else if (active === "owner") {
    eb.setDescription("*Restricted to the bot owner.*").addFields({
      name: "Commands",
      value: [
        "`/broadcast` — message every server",
        "`/blacklist` — block a user from using the bot",
        "`/customcommand` — make custom server commands",
      ].join("\n"),
    });
  }
  return eb;
}

export function buildLevelsToggleRow(enabled: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel:levels:toggle")
      .setLabel(enabled ? "◆ Disable Levels" : "◇ Enable Levels")
      .setStyle(ButtonStyle.Secondary)
  );
}

export async function buildPanel(active: PanelTab, guildId: string) {
  const eb = await buildPanelEmbed(active, guildId);
  const components: (
    | ActionRowBuilder<StringSelectMenuBuilder>
    | ActionRowBuilder<ButtonBuilder>
  )[] = buildPanelRows(active);

  if (active === "levels") {
    const s = await getGuildSettings(guildId);
    components.push(buildLevelsToggleRow(s.levelsEnabled));
  }
  return { embeds: [eb], components };
}

export async function handlePanelInteraction(
  _client: Client,
  interaction: ButtonInteraction | StringSelectMenuInteraction
) {
  if (!interaction.guild || !interaction.member) {
    return interaction.reply({
      content: "Server only.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Interaction.member is already populated from the gateway cache in the
  // vast majority of cases — only fall back to a REST fetch when it isn't,
  // instead of hitting the API on every tab switch.
  const member =
    interaction.member instanceof GuildMember
      ? interaction.member
      : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!member || !checkTier(member, "admin")) {
    return interaction.reply({
      content: "You need admin permission to use the panel.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Ack immediately — the fetch above plus the DB read in buildPanel can
  // exceed Discord's 3s interaction window under load.
  await interaction.deferUpdate();

  if (interaction.isStringSelectMenu() && interaction.customId === "panel:tab") {
    const tab = interaction.values[0] as PanelTab;
    const payload = await buildPanel(tab, interaction.guild.id);
    return interaction.editReply(payload);
  }

  if (interaction.isButton() && interaction.customId === "panel:levels:toggle") {
    const s = await getGuildSettings(interaction.guild.id);
    await updateGuildSettings(interaction.guild.id, { levelsEnabled: !s.levelsEnabled });
    const payload = await buildPanel("levels", interaction.guild.id);
    return interaction.editReply(payload);
  }
}
