import { EmbedBuilder, type GuildMember, type Guild, type User, type TextChannel } from "discord.js";

export interface ScriptingContext {
  user?: User | GuildMember | null;
  guild?: Guild | null;
  channel?: TextChannel | null;
  extra?: Record<string, string>;
}

// ── Named colours (matches bleed's list) ─────────────────────────────────────
const NAMED_COLORS: Record<string, number> = {
  red:        0xe74c3c,
  blue:       0x3498db,
  green:      0x2ecc71,
  yellow:     0xf1c40f,
  orange:     0xe67e22,
  purple:     0x9b59b6,
  pink:       0xe91e8c,
  white:      0xffffff,
  black:      0x000000,
  blurple:    0x5865f2,
  greyple:    0x99aab5,
  darkgrey:   0x2c2f33,
  darkgray:   0x2c2f33,
  navy:       0x34495e,
  aqua:       0x1abc9c,
  gold:       0xf1c40f,
  magenta:    0xe91e63,
  luminous:   0xfee75c,
  fuchsia:    0xeb459e,
  invisible:  0x2b2d31,
  invis:      0x2b2d31,
  random:     Math.floor(Math.random() * 0xffffff),
};

function parseColor(val: string): number | null {
  const t = val.trim().toLowerCase();
  if (t === "random") return Math.floor(Math.random() * 0xffffff);
  if (NAMED_COLORS[t] !== undefined) return NAMED_COLORS[t]!;
  const hex = parseInt(t.replace(/^#/, ""), 16);
  return isNaN(hex) ? null : hex;
}

// ── /e → newline (bleed's line-break token) ───────────────────────────────────
function applyNewlines(text: string): string {
  return text
    .replace(/\s*\/e\s*/g, "\n")
    .replace(/\\n/g, "\n");
}

// ── Variable substitution ─────────────────────────────────────────────────────
function resolveVars(text: string, ctx: ScriptingContext): string {
  const user   = ctx.user instanceof Object && "user" in ctx.user
    ? (ctx.user as GuildMember).user
    : ctx.user as User | null | undefined;
  const member = ctx.user instanceof Object && "roles" in ctx.user
    ? ctx.user as GuildMember
    : null;
  const guild = ctx.guild;
  const now   = new Date();

  const map: Record<string, string> = {
    // User
    "{user}":                  user?.displayName ?? user?.username ?? "Unknown",
    "{user.mention}":          user ? `<@${user.id}>` : "Unknown",
    "{user.name}":             user?.username ?? "Unknown",
    "{user.id}":               user?.id ?? "0",
    "{user.avatar}":           user?.displayAvatarURL() ?? "",
    "{user.tag}":              user?.tag ?? "Unknown#0000",
    "{user.discriminator}":    user?.discriminator ?? "0",
    "{user.globalname}":       user?.globalName ?? user?.username ?? "Unknown",
    "{user.created_at}":       user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` : "",
    "{user.created_at.full}":  user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` : "",
    "{user.bot}":              user?.bot ? "yes" : "no",
    "{user.banner}":           (user as any)?.bannerURL?.() ?? "",
    // Member
    "{member.joined_at}":       member ? `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:R>` : "",
    "{member.joined_at.full}":  member ? `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:F>` : "",
    "{member.nickname}":        member?.nickname ?? user?.username ?? "Unknown",
    "{member.roles}":           member
      ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(", ") || "none"
      : "none",
    "{member.top_role}":        member ? `<@&${member.roles.highest.id}>` : "none",
    "{member.boost}":           member?.premiumSince
      ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`
      : "not boosting",
    "{member.display_avatar}":  member?.displayAvatarURL() ?? user?.displayAvatarURL() ?? "",
    // Guild
    "{guild}":               guild?.name ?? "Unknown",
    "{guild.name}":          guild?.name ?? "Unknown",
    "{guild.id}":            guild?.id ?? "0",
    "{guild.icon}":          guild?.iconURL() ?? "",
    "{guild.banner}":        guild?.bannerURL() ?? "",
    "{guild.member_count}":  guild?.memberCount?.toString() ?? "0",
    "{guild.boost_count}":   guild?.premiumSubscriptionCount?.toString() ?? "0",
    "{guild.boost_level}":   guild?.premiumTier?.toString() ?? "0",
    "{guild.created_at}":    guild ? `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>` : "",
    "{guild.owner}":         guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown",
    "{guild.description}":   guild?.description ?? "",
    "{guild.vanity}":        guild?.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : "none",
    "{guild.channel_count}": guild?.channels.cache.size.toString() ?? "0",
    "{guild.role_count}":    guild?.roles.cache.size.toString() ?? "0",
    "{guild.emoji_count}":   guild?.emojis.cache.size.toString() ?? "0",
    // Channel
    "{channel}":         ctx.channel ? `<#${ctx.channel.id}>` : "Unknown",
    "{channel.name}":    ctx.channel?.name ?? "Unknown",
    "{channel.id}":      ctx.channel?.id ?? "0",
    "{channel.mention}": ctx.channel ? `<#${ctx.channel.id}>` : "Unknown",
    // Time
    "{time}":      `<t:${Math.floor(now.getTime() / 1000)}:T>`,
    "{date}":      `<t:${Math.floor(now.getTime() / 1000)}:D>`,
    "{timestamp}": `<t:${Math.floor(now.getTime() / 1000)}:F>`,
    "{unix}":      String(Math.floor(now.getTime() / 1000)),
    // Misc
    "{newline}": "\n",
    "{nl}":      "\n",
    ...(ctx.extra ?? {}),
  };

  let result = text;
  for (const [k, v] of Object.entries(map)) {
    result = result.replaceAll(k, v);
  }
  return result;
}

// ── Parse one embed block (everything between two {embed} tokens) ─────────────
function parseEmbedBlock(block: string): { eb: EmbedBuilder; content?: string } {
  const eb = new EmbedBuilder();
  let content: string | undefined;

  // Strip leading $v
  const body = block.replace(/^\s*\$v\s*/, "");

  // Each property is wrapped in {key: value} and separated by $v
  // Split on "$v{" to get individual property chunks, then restore the "{"
  const chunks = body.split(/\$v(?=\{)/);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed.startsWith("{")) continue;

    // Remove outer braces — handle nested {} in URLs/values
    const inner = trimmed.replace(/^\{/, "").replace(/\}$/, "");
    const colon = inner.indexOf(":");
    if (colon === -1) continue;

    const key = inner.slice(0, colon).trim().toLowerCase();
    const raw = inner.slice(colon + 1).trim();
    const val = applyNewlines(raw);

    switch (key) {
      case "title":
        eb.setTitle(val.slice(0, 256));
        break;

      case "description":
        eb.setDescription(val.slice(0, 4096));
        break;

      case "color":
      case "colour": {
        const c = parseColor(val);
        if (c !== null) eb.setColor(c);
        break;
      }

      case "url":
        try { eb.setURL(val); } catch { /* bad url */ }
        break;

      case "image":
        try { eb.setImage(val); } catch { /* bad url */ }
        break;

      case "thumbnail":
        try { eb.setThumbnail(val); } catch { /* bad url */ }
        break;

      case "timestamp":
        if (!val || val === "now") {
          eb.setTimestamp();
        } else {
          const ts = parseInt(val);
          eb.setTimestamp(isNaN(ts) ? undefined : ts * 1000);
        }
        break;

      case "footer": {
        // {footer: text} or {footer: text && icon_url}
        const parts = val.split("&&").map(s => s.trim());
        const text = parts[0] ?? "";
        const icon = parts[1];
        if (text) {
          try {
            eb.setFooter({ text: text.slice(0, 2048), iconURL: icon || undefined });
          } catch {
            eb.setFooter({ text: text.slice(0, 2048) });
          }
        }
        break;
      }

      case "author": {
        // {author: name} | {author: name && icon_url} | {author: name && icon_url && url}
        const parts = val.split("&&").map(s => s.trim());
        const name = parts[0] ?? "";
        const icon = parts[1];
        const url  = parts[2];
        if (name) {
          try {
            eb.setAuthor({ name: name.slice(0, 256), iconURL: icon || undefined, url: url || undefined });
          } catch {
            try { eb.setAuthor({ name: name.slice(0, 256), iconURL: icon || undefined }); }
            catch { eb.setAuthor({ name: name.slice(0, 256) }); }
          }
        }
        break;
      }

      case "field": {
        // {field: name && value} | {field: name && value && inline}
        const parts = val.split("&&").map(s => s.trim());
        const fname  = parts[0] ?? "";
        const fval   = parts[1] ?? "";
        const finline = parts[2]?.toLowerCase();
        if (fname && fval) {
          try {
            eb.addFields({
              name:   fname.slice(0, 256) || "\u200b",
              value:  fval.slice(0, 1024) || "\u200b",
              inline: finline === "true" || finline === "inline",
            });
          } catch { /* ignore */ }
        }
        break;
      }

      // Plain message content (sent alongside the embeds, not inside them)
      case "content":
      case "message":
        content = val;
        break;
    }
  }

  return { eb, content };
}

// ── Main export: full bleed-compatible multi-embed parser ─────────────────────
export function parseScript(
  raw: string,
  ctx: ScriptingContext = {},
): { embeds: EmbedBuilder[]; content?: string } {
  const resolved = resolveVars(raw, ctx);

  if (!resolved.includes("{embed}")) {
    return { embeds: [], content: applyNewlines(resolved) };
  }

  // Split on every {embed} occurrence — each segment is one embed
  const segments = resolved.split("{embed}").filter(s => s.trim().length > 0);

  const embeds: EmbedBuilder[] = [];
  let content: string | undefined;

  for (const seg of segments) {
    const { eb, content: c } = parseEmbedBlock(seg);
    embeds.push(eb);
    if (c && !content) content = c;
  }

  return { embeds: embeds.slice(0, 10), content };
}

// ── Compat shim for commands that expect a single embed ───────────────────────
export function parseSingleScript(
  raw: string,
  ctx: ScriptingContext = {},
): { embed?: EmbedBuilder; content?: string } {
  const { embeds, content } = parseScript(raw, ctx);
  return { embed: embeds[0], content };
}
