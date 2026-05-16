import { EmbedBuilder, type Guild, type User } from "discord.js";
import { config } from "../config.js";

// ── Colour palette ─────────────────────────────────────────────────────────────
// null  = no sidebar color — embeds blend into Discord (bleed-style premium look)
// Muted tones only for status embeds; never bright neons.
const C = {
  brand:   null,          // no color — native Discord feel
  success: 0x2a9d54,      // muted green
  error:   0xc0392b,      // muted red
  warn:    0xe67e22,      // muted amber
  info:    0x2f3136,      // near-black — subtle info
  mod:     0x111114,      // near-black for mod actions
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EmbedOpts {
  title?:       string;
  description?: string;
  page?:        string;
  guild?:       Guild | null;
  user?:        User | null;
  thumbnail?:   string;
  image?:       string;
  fields?:      { name: string; value: string; inline?: boolean }[];
  color?:       number | null;
  authorName?:  string;
  authorIcon?:  string;
}

interface ModEmbedOpts {
  action:     string;
  target:     User;
  moderator:  User;
  reason:     string;
  caseId?:    number;
  duration?:  string;
}

// ── Footer helper ─────────────────────────────────────────────────────────────
function footer(page?: string): { text: string; iconURL?: string } {
  return {
    text: page
      ? `${config.embedFooter}  ·  ${page.toLowerCase()}`
      : config.embedFooter.toLowerCase(),
  };
}

// ── Base builder — shared setup for every embed ───────────────────────────────
function base(color: number | null = null): EmbedBuilder {
  const eb = new EmbedBuilder().setTimestamp();
  // Discord.js requires a number for setColor; null removes the sidebar
  if (color !== null) eb.setColor(color);
  return eb;
}

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Primary embed — no sidebar color, clean and native-feeling.
 * Use for all standard command responses.
 */
export function brandEmbed(opts: EmbedOpts = {}): EmbedBuilder {
  const eb = base(opts.color !== undefined ? opts.color : C.brand)
    .setFooter(footer(opts.page));

  if (opts.description) eb.setDescription(opts.description);
  if (opts.fields?.length) eb.addFields(opts.fields);
  if (opts.thumbnail)   eb.setThumbnail(opts.thumbnail);
  if (opts.image)       eb.setImage(opts.image);

  // Author — prefer explicit opts, then guild, then user
  if (opts.authorName) {
    eb.setAuthor({ name: opts.authorName, iconURL: opts.authorIcon });
  } else if (opts.guild) {
    eb.setAuthor({ name: opts.guild.name, iconURL: opts.guild.iconURL() ?? undefined });
  } else if (opts.user) {
    eb.setAuthor({ name: opts.user.username, iconURL: opts.user.displayAvatarURL() });
  }

  return eb;
}

/**
 * Success embed — muted green sidebar, no emoji prefix, lowercase text.
 */
export function successEmbed(message: string, page?: string): EmbedBuilder {
  return base(C.success)
    .setDescription(message.toLowerCase())
    .setFooter(footer(page));
}

/**
 * Error embed — muted red sidebar, no emoji prefix, lowercase text.
 */
export function errorEmbed(message: string, page?: string): EmbedBuilder {
  return base(C.error)
    .setDescription(message.toLowerCase())
    .setFooter(footer(page));
}

/**
 * Info embed — subtle dark sidebar for informational responses.
 */
export function infoEmbed(message: string, _title?: string, page?: string): EmbedBuilder {
  return base(C.info)
    .setDescription(message.toLowerCase())
    .setFooter(footer(page));
}

/**
 * Warn embed — muted amber sidebar.
 */
export function warnEmbed(message: string, page?: string): EmbedBuilder {
  return base(C.warn)
    .setDescription(message.toLowerCase())
    .setFooter(footer(page));
}

/**
 * Mod action embed — near-black, author = "action · target", clean field list.
 * Used by ban, kick, mute, warn, etc.
 */
export function modEmbed(opts: ModEmbedOpts): EmbedBuilder {
  const lines: string[] = [
    `**reason** — ${opts.reason.toLowerCase()}`,
    `**moderator** — ${opts.moderator.username.toLowerCase()}`,
  ];
  if (opts.duration) lines.push(`**duration** — ${opts.duration.toLowerCase()}`);
  if (opts.caseId)   lines.push(`**case** — #${opts.caseId}`);

  return base(C.mod)
    .setAuthor({
      name:    `${opts.action.toLowerCase()}  ·  ${opts.target.username.toLowerCase()}`,
      iconURL: opts.target.displayAvatarURL(),
    })
    .setDescription(lines.join("\n"))
    .setFooter(footer("moderation"));
}
