import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type GuildMember, type Guild, type User, type TextChannel, type Client,
} from "discord.js";

export interface ScriptingContext {
  user?: User | GuildMember | null;
  guild?: Guild | null;
  channel?: TextChannel | null;
  client?: Client | null;
  extra?: Record<string, string>;
  ticket?: {
    id?: number | string;
    channelId?: string;
    openerId?: string;
    claimerId?: string | null;
    closerId?: string | null;
    topic?: string | null;
    number?: number;
    closeReason?: string | null;
  } | null;
  level?: { current?: number; next?: number; xpCurrent?: number; xpNext?: number } | null;
  boost?: { count?: number; tier?: number } | null;
  bump?: { nextAt?: Date | null; lastBumper?: string | null } | null;
}

const NAMED_COLORS: Record<string, number> = {
  red: 0xe74c3c, blue: 0x3498db, green: 0x2ecc71, yellow: 0xf1c40f, orange: 0xe67e22,
  purple: 0x9b59b6, pink: 0xe91e8c, white: 0xffffff, black: 0x000000,
  blurple: 0x5865f2, greyple: 0x99aab5, grey: 0x99aab5, gray: 0x99aab5,
  darkgrey: 0x2c2f33, darkgray: 0x2c2f33, navy: 0x34495e, aqua: 0x1abc9c,
  teal: 0x1abc9c, cyan: 0x00bcd4, gold: 0xf1c40f, magenta: 0xe91e63,
  luminous: 0xfee75c, fuchsia: 0xeb459e, lime: 0x57f287, mint: 0x2ecc71,
  invisible: 0x2b2d31, invis: 0x2b2d31, dark: 0x2b2d31, default: 0x000000, embed: 0x2b2d31,
};

function parseColor(val: string): number | null {
  const t = val.trim().toLowerCase();
  if (t === "random") return Math.floor(Math.random() * 0xffffff);
  if (NAMED_COLORS[t] !== undefined) return NAMED_COLORS[t]!;
  const hex = parseInt(t.replace(/^#/, ""), 16);
  return isNaN(hex) ? null : hex;
}

function applyNewlines(text: string): string {
  return text.replace(/\s*\/e\s*/g, "\n").replace(/\\n/g, "\n");
}

function resolveEmojis(text: string, ctx: ScriptingContext): string {
  const guild = ctx.guild;
  const client = ctx.client;
  if (!guild && !client) return text;
  return text.replace(/:([a-zA-Z0-9_]+):/g, (match, name: string) => {
    const lower = name.toLowerCase();
    if (guild) {
      const ge = guild.emojis.cache.find(e => e.name?.toLowerCase() === lower);
      if (ge) return ge.toString();
    }
    if (client) {
      const ae = (client.application?.emojis as any)?.cache?.find((e: any) => e.name?.toLowerCase() === lower);
      if (ae) return ae.toString();
    }
    return match;
  });
}

function resolveVars(text: string, ctx: ScriptingContext): string {
  const user = ctx.user instanceof Object && "user" in ctx.user
    ? (ctx.user as GuildMember).user : ctx.user as User | null | undefined;
  const member = ctx.user instanceof Object && "roles" in ctx.user
    ? ctx.user as GuildMember : null;
  const guild = ctx.guild;
  const now = new Date();
  const ticket = ctx.ticket;
  const level = ctx.level;
  const boost = ctx.boost ?? { count: guild?.premiumSubscriptionCount ?? 0, tier: guild?.premiumTier ?? 0 };
  const bump = ctx.bump;

  const map: Record<string, string> = {
    // User
    "{user}": user?.displayName ?? user?.username ?? "Unknown",
    "{user.mention}": user ? `<@${user.id}>` : "Unknown",
    "{user.id}": user?.id ?? "0",
    "{user.tag}": user?.tag ?? "Unknown",
    "{user.username}": user?.username ?? "Unknown",
    "{user.displayname}": member?.displayName ?? user?.displayName ?? user?.username ?? "Unknown",
    "{user.avatar}": user?.displayAvatarURL() ?? "",
    "{user.banner}": (user as any)?.bannerURL?.() ?? "",
    "{user.created}": user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` : "Unknown",
    "{user.joined}": member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown",
    "{user.booster}": member?.premiumSince ? "true" : "false",
    "{user.nickname}": member?.nickname ?? user?.username ?? "Unknown",
    "{user.roles}": member?.roles.cache.filter(r => r.id !== guild?.id).map(r => `<@&${r.id}>`).join(", ") ?? "none",
    "{user.highest_role}": member?.roles.highest.id !== guild?.id ? `<@&${member?.roles.highest.id}>` : "none",
    // Guild
    "{guild}": guild?.name ?? "Unknown",
    "{guild.name}": guild?.name ?? "Unknown",
    "{guild.id}": guild?.id ?? "0",
    "{guild.icon}": guild?.iconURL() ?? "",
    "{guild.count}": String(guild?.memberCount ?? 0),
    "{guild.members}": String(guild?.memberCount ?? 0),
    "{guild.owner}": guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown",
    "{guild.boost_count}": String(boost.count ?? 0),
    "{guild.boost_tier}": String(boost.tier ?? 0),
    "{guild.vanity}": guild?.vanityURLCode ?? "none",
    "{guild.created}": guild ? `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>` : "Unknown",
    "{guild.channel_count}": String(guild?.channels.cache.size ?? 0),
    "{guild.role_count}": String(guild?.roles.cache.size ?? 0),
    // Time
    "{time}": `<t:${Math.floor(now.getTime() / 1000)}:T>`,
    "{date}": `<t:${Math.floor(now.getTime() / 1000)}:D>`,
    "{unix}": String(Math.floor(now.getTime() / 1000)),
    "{timestamp}": `<t:${Math.floor(now.getTime() / 1000)}:F>`,
    "{timestamp.relative}": `<t:${Math.floor(now.getTime() / 1000)}:R>`,
    // Ticket
    "{ticket}": ticket?.number ? String(ticket.number).padStart(4, "0") : "0000",
    "{ticket.id}": String(ticket?.id ?? 0),
    "{ticket.number}": String(ticket?.number ?? 0),
    "{ticket.opener}": ticket?.openerId ? `<@${ticket.openerId}>` : "Unknown",
    "{ticket.claimer}": ticket?.claimerId ? `<@${ticket.claimerId}>` : "unclaimed",
    "{ticket.topic}": ticket?.topic ?? "general",
    "{ticket.reason}": ticket?.closeReason ?? "no reason provided",
    // Level
    "{level}": String(level?.current ?? 0),
    "{level.next}": String(level?.next ?? 0),
    "{xp}": String(level?.xpCurrent ?? 0),
    "{xp.next}": String(level?.xpNext ?? 0),
    // Bump
    "{bump.next}": bump?.nextAt ? `<t:${Math.floor(bump.nextAt.getTime() / 1000)}:R>` : "soon",
    "{bump.bumper}": bump?.lastBumper ? `<@${bump.lastBumper}>` : "Unknown",
  };

  // Apply extra vars first (they override)
  const allVars = { ...map, ...(ctx.extra ?? {}) };

  let result = text;
  for (const [k, v] of Object.entries(allVars)) {
    result = result.split(k).join(v);
  }
  return result;
}

// ── Conditional processing ────────────────────────────────────────────────────
function processConditionals(text: string): string {
  // Handle {if:expr}...{elseif:expr}...{else}...{/if} blocks
  const ifRegex = /\{if:([^}]+)\}([\s\S]*?)\{\/if\}/g;

  return text.replace(ifRegex, (_, _conditions, body) => {
    // Split by elseif/else
    const parts: { condition: string | null; content: string }[] = [];

    // Parse elseif and else blocks
    const elseifRegex = /\{elseif:([^}]+)\}/g;
    const elseRegex = /\{else\}/g;

    let lastIndex = 0;
    let currentCondition = _conditions.trim();
    let remaining = body;

    // Find all {elseif:...} and {else} splits
    const splits: { type: "elseif" | "else"; condition?: string; index: number; length: number }[] = [];

    let m: RegExpExecArray | null;
    elseifRegex.lastIndex = 0;
    while ((m = elseifRegex.exec(body)) !== null) {
      splits.push({ type: "elseif", condition: m[1].trim(), index: m.index, length: m[0].length });
    }
    elseRegex.lastIndex = 0;
    while ((m = elseRegex.exec(body)) !== null) {
      splits.push({ type: "else", index: m.index, length: m[0].length });
    }
    splits.sort((a, b) => a.index - b.index);

    // Build segments
    const segments: { condition: string | null; content: string }[] = [];
    let pos = 0;
    let activeCond: string | null = _conditions.trim();

    for (const split of splits) {
      segments.push({ condition: activeCond, content: body.slice(pos, split.index) });
      pos = split.index + split.length;
      activeCond = split.type === "elseif" ? (split.condition ?? null) : null;
    }
    segments.push({ condition: activeCond, content: body.slice(pos) });

    for (const seg of segments) {
      if (seg.condition === null) {
        // else branch — always runs if we get here
        return seg.content.trim();
      }
      if (evalCondition(seg.condition)) {
        return seg.content.trim();
      }
    }
    return "";
  });
}

function evalCondition(cond: string): boolean {
  // Support: value==expected, value!=expected, value contains text
  const eqMatch = cond.match(/^(.+)==(.+)$/);
  if (eqMatch) return eqMatch[1]!.trim() === eqMatch[2]!.trim();
  const neqMatch = cond.match(/^(.+)!=(.+)$/);
  if (neqMatch) return neqMatch[1]!.trim() !== neqMatch[2]!.trim();
  const containsMatch = cond.match(/^(.+) contains (.+)$/i);
  if (containsMatch) return containsMatch[1]!.trim().toLowerCase().includes(containsMatch[2]!.trim().toLowerCase());
  // Truthy check
  return cond.trim() !== "" && cond.trim() !== "false" && cond.trim() !== "0";
}

function parseEmbedBlock(seg: string, ctx: ScriptingContext): {
  eb: EmbedBuilder;
  content?: string;
  buttons: ActionRowBuilder<ButtonBuilder>[];
} {
  const eb = new EmbedBuilder();
  const buttons: ActionRowBuilder<ButtonBuilder>[] = [];
  let msgContent: string | undefined;
  let currentRow: ButtonBuilder[] = [];

  const params = seg.split(/\$v\{/).slice(1);

  for (const raw of params) {
    const trimmed = raw.trimEnd();
    const closing = trimmed.lastIndexOf("}");
    if (closing === -1) continue;
    const inner = trimmed.slice(0, closing);
    const colonIdx = inner.indexOf(":");
    if (colonIdx === -1) continue;
    const key = inner.slice(0, colonIdx).trim().toLowerCase();
    const val = inner.slice(colonIdx + 1).trim();

    switch (key) {
      case "title": eb.setTitle(val.slice(0, 256)); break;
      case "description": eb.setDescription(applyNewlines(val).slice(0, 4096)); break;
      case "color": { const c = parseColor(val); if (c !== null) eb.setColor(c); break; }
      case "url": eb.setURL(val); break;
      case "thumbnail": eb.setThumbnail(val); break;
      case "image": eb.setImage(val); break;
      case "footer": eb.setFooter({ text: val.slice(0, 2048) }); break;
      case "author": eb.setAuthor({ name: val.slice(0, 256) }); break;
      case "timestamp": eb.setTimestamp(val === "now" || val === "" ? Date.now() : parseInt(val) || Date.now()); break;
      case "field": {
        const parts = val.split("|").map(s => s.trim());
        if (parts.length >= 2) eb.addFields({ name: parts[0]!.slice(0, 256), value: parts[1]!.slice(0, 1024), inline: parts[2] === "true" });
        break;
      }
      case "content": msgContent = val; break;
      case "button": {
        // label | url_or_id | style?
        const parts = val.split("|").map(s => s.trim());
        if (parts.length >= 2) {
          const btn = new ButtonBuilder();
          const label = parts[0]!;
          const target = parts[1]!;
          const style = (parts[2] ?? "primary").toLowerCase();
          btn.setLabel(label);
          if (target.startsWith("http")) {
            btn.setStyle(ButtonStyle.Link).setURL(target);
          } else {
            const styleMap: Record<string, ButtonStyle> = {
              primary: ButtonStyle.Primary, secondary: ButtonStyle.Secondary,
              success: ButtonStyle.Success, danger: ButtonStyle.Danger,
            };
            btn.setStyle(styleMap[style] ?? ButtonStyle.Primary).setCustomId(target);
          }
          currentRow.push(btn);
          if (currentRow.length === 5) {
            buttons.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...currentRow));
            currentRow = [];
          }
        }
        break;
      }
    }
  }

  if (currentRow.length > 0) {
    buttons.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...currentRow));
  }

  return { eb, content: msgContent, buttons };
}

export function parseScript(
  raw: string,
  ctx: ScriptingContext = {},
): { embeds: EmbedBuilder[]; content?: string; components: ActionRowBuilder<ButtonBuilder>[] } {
  // Apply variable substitution first
  const withVars = resolveVars(raw, ctx);
  // Apply conditionals
  const withConds = processConditionals(withVars);
  // Apply emoji resolution
  const resolved = resolveEmojis(withConds, ctx);

  if (!resolved.includes("{embed}")) {
    return { embeds: [], content: applyNewlines(resolved.trim()), components: [] };
  }

  const parts = resolved.split("{embed}");
  const plainText = parts[0]!.trim();
  const embedSegments = parts.slice(1).filter(s => s.trim().length > 0);

  const embeds: EmbedBuilder[] = [];
  let content: string | undefined = plainText ? applyNewlines(plainText) : undefined;
  const allComponents: ActionRowBuilder<ButtonBuilder>[] = [];

  for (const seg of embedSegments) {
    const { eb, content: c, buttons } = parseEmbedBlock(seg, ctx);
    embeds.push(eb);
    if (c && !content) content = c;
    allComponents.push(...buttons);
  }

  return { embeds: embeds.slice(0, 10), content, components: allComponents.slice(0, 5) };
}

export function parseSingleScript(
  raw: string,
  ctx: ScriptingContext = {},
): { embed?: EmbedBuilder; content?: string; components: ActionRowBuilder<ButtonBuilder>[] } {
  const { embeds, content, components } = parseScript(raw, ctx);
  return { embed: embeds[0], content, components };
}
