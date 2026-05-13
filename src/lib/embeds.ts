import { EmbedBuilder, type Guild, type User } from "discord.js";
import { config } from "../config.js";

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  brand:   0x9B59B6,  // mourn purple
  success: 0x57F287,  // bright green
  error:   0xED4245,  // bright red
  info:    0x5865F2,  // blurple
  warn:    0xFEE75C,  // yellow
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmbedOpts {
  title?: string;
  description?: string;
  page?: string;
  guild?: Guild | null;
  user?: User | null;
  thumbnail?: string;
  image?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

interface ModEmbedOpts {
  action: string;
  target: User;
  moderator: User;
  reason: string;
  caseId?: number;
  duration?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function footer(page?: string): { text: string } {
  return { text: page ? `${config.embedFooter}  ·  ${page}` : config.embedFooter };
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function brandEmbed(opts: EmbedOpts = {}): EmbedBuilder {
  const eb = new EmbedBuilder()
    .setColor(C.brand)
    .setFooter(footer(opts.page))
    .setTimestamp();

  if (opts.title)            eb.setTitle(opts.title);
  if (opts.description)      eb.setDescription(opts.description);
  if (opts.fields?.length)   eb.addFields(opts.fields);
  if (opts.thumbnail)        eb.setThumbnail(opts.thumbnail);
  if (opts.image)            eb.setImage(opts.image);

  if (opts.guild) {
    eb.setAuthor({ name: opts.guild.name, iconURL: opts.guild.iconURL() ?? undefined });
  } else if (opts.user) {
    eb.setAuthor({ name: opts.user.username, iconURL: opts.user.displayAvatarURL() });
  }

  return eb;
}

export function successEmbed(message: string, page?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(C.success)
    .setDescription(`✅  ${message}`)
    .setFooter(footer(page))
    .setTimestamp();
}

export function errorEmbed(message: string, page?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(C.error)
    .setDescription(`❌  ${message}`)
    .setFooter(footer(page))
    .setTimestamp();
}

export function infoEmbed(message: string, title?: string, page?: string): EmbedBuilder {
  const eb = new EmbedBuilder()
    .setColor(C.info)
    .setDescription(message)
    .setFooter(footer(page))
    .setTimestamp();
  if (title) eb.setTitle(title);
  return eb;
}

export function warnEmbed(message: string, page?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(C.warn)
    .setDescription(`⚠️  ${message}`)
    .setFooter(footer(page))
    .setTimestamp();
}

export function modEmbed(opts: ModEmbedOpts): EmbedBuilder {
  const lines: string[] = [
    `**Reason** — ${opts.reason}`,
    `**Moderator** — ${opts.moderator.username}`,
  ];
  if (opts.duration) lines.push(`**Duration** — ${opts.duration}`);
  if (opts.caseId)   lines.push(`**Case** — #${opts.caseId}`);

  return new EmbedBuilder()
    .setColor(C.brand)
    .setAuthor({
      name: `${opts.action}  ·  ${opts.target.username}`,
      iconURL: opts.target.displayAvatarURL(),
    })
    .setDescription(lines.join("\n"))
    .setFooter(footer("Moderation"))
    .setTimestamp();
}
