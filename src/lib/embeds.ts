import { EmbedBuilder, type Guild, type User } from "discord.js";

// ── Bleed-style color palette ──────────────────────────────────────────────────
const C = {
  success: 0x57F287,  // bright green
  error:   0xFFA500,  // golden yellow (bleed uses yellow not red)
  action:  0x5865F2,  // discord blurple
  mod:     0x2b2d31,  // near-black for mod actions
} as const;

// ── Custom emoji config ────────────────────────────────────────────────────────
// After uploading emojis to Discord Developer Portal → Your App → Emojis,
// set these env vars in Railway: EMOJI_CHECK, EMOJI_WARN, EMOJI_PLUS, EMOJI_CROSS
export const EMOJIS = {
  check: process.env.EMOJI_CHECK ?? "✅",
  warn:  process.env.EMOJI_WARN  ?? "⚠️",
  plus:  process.env.EMOJI_PLUS  ?? "➕",
  cross: process.env.EMOJI_CROSS ?? "❌",
  info:  process.env.EMOJI_INFO  ?? "ℹ️",
} as const;

// ── Embed style tracking — contextFactory reads this to inject user mention ────
export type EmbedStyle = "success" | "error" | "warn" | "action" | "mod" | "brand";
const _styles = new WeakMap<EmbedBuilder, EmbedStyle>();
export function getEmbedStyle(eb: EmbedBuilder): EmbedStyle | undefined {
  return _styles.get(eb);
}

function base(color: number | null = null): EmbedBuilder {
  const eb = new EmbedBuilder();
  if (color !== null) eb.setColor(color);
  return eb;
}

// ── Styled embeds (contextFactory auto-injects "emoji @user: " prefix) ─────────

/** Green sidebar — "✅ @user: message" */
export function successEmbed(message: string, _page?: unknown): EmbedBuilder {
  const eb = base(C.success).setDescription(message.toLowerCase());
  _styles.set(eb, "success");
  return eb;
}

/** Yellow sidebar — "⚠️ @user: message" */
export function errorEmbed(message: string, _page?: unknown): EmbedBuilder {
  const eb = base(C.error).setDescription(message.toLowerCase());
  _styles.set(eb, "error");
  return eb;
}

/** Yellow sidebar — "⚠️ @user: message" (alias for errorEmbed) */
export function warnEmbed(message: string, _page?: unknown): EmbedBuilder {
  const eb = base(C.error).setDescription(message.toLowerCase());
  _styles.set(eb, "warn");
  return eb;
}

/** Blurple sidebar — "➕ @user: message" */
export function actionEmbed(message: string, _page?: unknown): EmbedBuilder {
  const eb = base(C.action).setDescription(message.toLowerCase());
  _styles.set(eb, "action");
  return eb;
}

/** No sidebar — plain info, no user mention injected */
export function infoEmbed(message: string, _title?: unknown, _page?: unknown): EmbedBuilder {
  const eb = new EmbedBuilder().setDescription(message);
  _styles.set(eb, "brand");
  return eb;
}

// ── Brand embed — help/info commands, no auto-inject ──────────────────────────
export interface EmbedOpts {
  title?:       string;
  description?: string;
  fields?:      { name: string; value: string; inline?: boolean }[];
  color?:       number | null;
  authorName?:  string;
  authorIcon?:  string;
  thumbnail?:   string;
  image?:       string;
  guild?:       Guild | null;
  user?:        User | null;
  page?:        string;
}

export function brandEmbed(opts: EmbedOpts = {}): EmbedBuilder {
  const eb = new EmbedBuilder();
  if (opts.color !== undefined && opts.color !== null) eb.setColor(opts.color);
  if (opts.description) eb.setDescription(opts.description);
  if (opts.title) eb.setTitle(opts.title);
  if (opts.fields?.length) eb.addFields(opts.fields);
  if (opts.thumbnail) eb.setThumbnail(opts.thumbnail);
  if (opts.image) eb.setImage(opts.image);
  if (opts.authorName) {
    eb.setAuthor({ name: opts.authorName, iconURL: opts.authorIcon });
  } else if (opts.guild) {
    eb.setAuthor({ name: opts.guild.name, iconURL: opts.guild.iconURL() ?? undefined });
  } else if (opts.user) {
    eb.setAuthor({ name: opts.user.username, iconURL: opts.user.displayAvatarURL() });
  }
  _styles.set(eb, "brand");
  return eb;
}

// ── Mod action embed ───────────────────────────────────────────────────────────
export interface ModEmbedOpts {
  action:     string;
  target:     User;
  moderator:  User;
  reason:     string;
  duration?:  string;
}

export function modEmbed(opts: ModEmbedOpts): EmbedBuilder {
  const lines: string[] = [
    `**reason** — ${opts.reason.toLowerCase()}`,
    `**moderator** — ${opts.moderator.username.toLowerCase()}`,
  ];
  if (opts.duration) lines.push(`**duration** — ${opts.duration.toLowerCase()}`);
  const eb = base(C.mod)
    .setAuthor({
      name:    `${opts.action.toLowerCase()} — ${opts.target.username.toLowerCase()}`,
      iconURL: opts.target.displayAvatarURL(),
    })
    .setDescription(lines.join("\n"));
  _styles.set(eb, "mod");
  return eb;
}

// ── Help embed — Bleed.bot style ───────────────────────────────────────────────
export function helpEmbed(
  cmd: { name: string; description: string; usage?: string },
  prefix: string,
): EmbedBuilder {
  const usageLine = cmd.usage ? `${prefix}${cmd.usage}` : `${prefix}${cmd.name}`;

  const fill = (s: string) =>
    s
      .replace(/\(member\)/gi, "remandment")
      .replace(/\[member\]/gi, "remandment")
      .replace(/\(user\)/gi, "remandment")
      .replace(/\[user\]/gi, "remandment")
      .replace(/\(target\)/gi, "remandment")
      .replace(/\[target\]/gi, "remandment")
      .replace(/\(duration\)/gi, "30m")
      .replace(/\[duration\]/gi, "30m")
      .replace(/\(reason\)/gi, "too awesome")
      .replace(/\[reason\]/gi, "too awesome")
      .replace(/\(channel\)/gi, "#general")
      .replace(/\[channel\]/gi, "#general")
      .replace(/\(role\)/gi, "Members")
      .replace(/\[role\]/gi, "Members")
      .replace(/\(amount\)/gi, "1000")
      .replace(/\[amount\]/gi, "1000")
      .replace(/\(time\)/gi, "30m")
      .replace(/\[time\]/gi, "30m")
      .replace(/\[\w+\]/g, "...")
      .replace(/\(\w+\)/g, "...");

  const exampleLine = fill(usageLine);
  const code = `Syntax:  ${usageLine}\nExample: ${exampleLine}`;

  const eb = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setAuthor({ name: "bleed help" })
    .setTitle(`Command: ${cmd.name}`)
    .setDescription(`${cmd.description}\n\`\`\`\n${code}\n\`\`\``);
  _styles.set(eb, "brand");
  return eb;
}
