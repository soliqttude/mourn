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
  } | null;
  level?: {
    current?: number;
    next?: number;
    xpCurrent?: number;
    xpNext?: number;
  } | null;
  boost?: {
    count?: number;
    tier?: number;
  } | null;
  bump?: {
    nextAt?: Date | null;
    lastBumper?: string | null;
  } | null;
}

// ── Named colours ─────────────────────────────────────────────────────────────
const NAMED_COLORS: Record<string, number> = {
  red: 0xe74c3c, blue: 0x3498db, green: 0x2ecc71, yellow: 0xf1c40f, orange: 0xe67e22,
  purple: 0x9b59b6, pink: 0xe91e8c, white: 0xffffff, black: 0x000000, blurple: 0x5865f2,
  greyple: 0x99aab5, darkgrey: 0x2c2f33, darkgray: 0x2c2f33, navy: 0x34495e,
  aqua: 0x1abc9c, gold: 0xf1c40f, magenta: 0xe91e63, luminous: 0xfee75c,
  fuchsia: 0xeb459e, invisible: 0x2b2d31, invis: 0x2b2d31,
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
      const ae = client.application?.emojis?.cache?.find(e => e.name?.toLowerCase() === lower);
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
    // ── User ──
    "{user}": user?.displayName ?? user?.username ?? "Unknown",
    "{user.mention}": user ? `<@${user.id}>` : "Unknown",
    "{user.name}": user?.username ?? "Unknown",
    "{user.id}": user?.id ?? "0",
    "{user.avatar}": user?.displayAvatarURL() ?? "",
    "{user.tag}": user?.tag ?? "Unknown#0000",
    "{user.discriminator}": user?.discriminator ?? "0",
    "{user.globalname}": user?.globalName ?? user?.username ?? "Unknown",
    "{user.created_at}": user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` : "",
    "{user.created_at.full}": user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` : "",
    "{user.bot}": user?.bot ? "yes" : "no",
    "{user.banner}": (user as any)?.bannerURL?.() ?? "",
    // ── Member ──
    "{member.joined_at}": member ? `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:R>` : "",
    "{member.joined_at.full}": member ? `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:F>` : "",
    "{member.nickname}": member?.nickname ?? user?.username ?? "Unknown",
    "{member.roles}": member
      ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(", ") || "none"
      : "none",
    "{member.top_role}": member ? `<@&${member.roles.highest.id}>` : "none",
    "{member.boost}": member?.premiumSince
      ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : "not boosting",
    "{member.display_avatar}": member?.displayAvatarURL() ?? user?.displayAvatarURL() ?? "",
    // ── Guild ──
    "{guild}": guild?.name ?? "Unknown",
    "{guild.name}": guild?.name ?? "Unknown",
    "{guild.id}": guild?.id ?? "0",
    "{guild.icon}": guild?.iconURL() ?? "",
    "{guild.banner}": guild?.bannerURL() ?? "",
    "{guild.member_count}": guild?.memberCount?.toString() ?? "0",
    "{guild.boost_count}": guild?.premiumSubscriptionCount?.toString() ?? "0",
    "{guild.boost_level}": guild?.premiumTier?.toString() ?? "0",
    "{guild.created_at}": guild ? `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>` : "",
    "{guild.owner}": guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown",
    "{guild.description}": guild?.description ?? "",
    "{guild.vanity}": guild?.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : "none",
    "{guild.channel_count}": guild?.channels.cache.size.toString() ?? "0",
    "{guild.role_count}": guild?.roles.cache.size.toString() ?? "0",
    "{guild.emoji_count}": guild?.emojis.cache.size.toString() ?? "0",
    // ── Channel ──
    "{channel}": ctx.channel ? `<#${ctx.channel.id}>` : "Unknown",
    "{channel.name}": ctx.channel?.name ?? "Unknown",
    "{channel.id}": ctx.channel?.id ?? "0",
    "{channel.mention}": ctx.channel ? `<#${ctx.channel.id}>` : "Unknown",
    // ── Time ──
    "{time}": `<t:${Math.floor(now.getTime() / 1000)}:T>`,
    "{date}": `<t:${Math.floor(now.getTime() / 1000)}:D>`,
    "{timestamp}": `<t:${Math.floor(now.getTime() / 1000)}:F>`,
    "{unix}": String(Math.floor(now.getTime() / 1000)),
    // ── Misc ──
    "{newline}": "\n",
    "{nl}": "\n",
    // ── Ticket ──
    "{ticket.id}": String(ticket?.id ?? ""),
    "{ticket.number}": String(ticket?.number ?? ""),
    "{ticket.channel}": ticket?.channelId ? `<#${ticket.channelId}>` : "Unknown",
    "{ticket.channel.id}": ticket?.channelId ?? "",
    "{ticket.opener.mention}": ticket?.openerId ? `<@${ticket.openerId}>` : "Unknown",
    "{ticket.opener.id}": ticket?.openerId ?? "",
    "{ticket.claimer.mention}": ticket?.claimerId ? `<@${ticket.claimerId}>` : "Unclaimed",
    "{ticket.claimer.id}": ticket?.claimerId ?? "",
    "{ticket.closer.mention}": ticket?.closerId ? `<@${ticket.closerId}>` : "Unknown",
    "{ticket.closer.id}": ticket?.closerId ?? "",
    "{ticket.topic}": ticket?.topic ?? "No topic",
    // ── Level ──
    "{level.current}": String(level?.current ?? 0),
    "{level.next}": String(level?.next ?? 0),
    "{level}": String(level?.current ?? 0),
    "{xp.current}": String(level?.xpCurrent ?? 0),
    "{xp.next}": String(level?.xpNext ?? 0),
    "{xp}": String(level?.xpCurrent ?? 0),
    // ── Boost ──
    "{boost.count}": String(boost?.count ?? guild?.premiumSubscriptionCount ?? 0),
    "{boost.level}": String(boost?.tier ?? guild?.premiumTier ?? 0),
    "{boost.tier}": String(boost?.tier ?? guild?.premiumTier ?? 0),
    // ── Bump ──
    "{bump.next}": bump?.nextAt ? `<t:${Math.floor(bump.nextAt.getTime() / 1000)}:R>` : "now",
    "{bump.bumper}": bump?.lastBumper ? `<@${bump.lastBumper}>` : "Unknown",
    // extra injected variables
    ...(ctx.extra ?? {}),
  };

  let result = text;
  for (const [k, v] of Object.entries(map)) {
    result = result.replaceAll(k, v);
  }
  return result;
}

// ── Button style resolver ─────────────────────────────────────────────────────
function resolveButtonStyle(raw: string): ButtonStyle {
  switch (raw.toLowerCase().trim()) {
    case "primary":   case "blurple": case "blue": return ButtonStyle.Primary;
    case "success":   case "green":               return ButtonStyle.Success;
    case "danger":    case "red":                 return ButtonStyle.Danger;
    case "link":      case "url":                 return ButtonStyle.Link;
    default:                                      return ButtonStyle.Secondary;
  }
}

// ── Parse one embed block ─────────────────────────────────────────────────────
function parseEmbedBlock(
  block: string,
  _ctx: ScriptingContext,
): { eb: EmbedBuilder; content?: string; buttons: ActionRowBuilder<ButtonBuilder>[] } {
  const eb = new EmbedBuilder();
  let content: string | undefined;
  const pendingButtons: ButtonBuilder[] = [];

  const body = block.replace(/^\s*\$v\s*/, "");
  const chunks = body.split(/\$v(?=\{)/);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed.startsWith("{")) continue;
    const inner = trimmed.replace(/^\{/, "").replace(/\}$/, "");
    const colon = inner.indexOf(":");
    if (colon === -1) continue;
    const key = inner.slice(0, colon).trim().toLowerCase();
    const raw = inner.slice(colon + 1).trim();
    const val = applyNewlines(raw);

    switch (key) {
      case "title":       eb.setTitle(val.slice(0, 256)); break;
      case "description": eb.setDescription(val.slice(0, 4096)); break;
      case "color": case "colour": {
        const c = parseColor(val); if (c !== null) eb.setColor(c); break;
      }
      case "url": try { eb.setURL(val); } catch { /* ignore */ } break;
      case "image": try { eb.setImage(val); } catch { /* ignore */ } break;
      case "thumbnail": try { eb.setThumbnail(val); } catch { /* ignore */ } break;
      case "timestamp":
        eb.setTimestamp(!val || val === "now" ? undefined : parseInt(val) * 1000); break;
      case "footer": {
        const parts = val.split("&&").map(s => s.trim());
        const text = parts[0] ?? "";
        const icon = parts[1];
        if (text) {
          try { eb.setFooter({ text: text.slice(0, 2048), iconURL: icon || undefined }); }
          catch { eb.setFooter({ text: text.slice(0, 2048) }); }
        }
        break;
      }
      case "author": {
        const parts = val.split("&&").map(s => s.trim());
        const name = parts[0] ?? "";
        const icon = parts[1];
        const url = parts[2];
        if (name) {
          try { eb.setAuthor({ name: name.slice(0, 256), iconURL: icon || undefined, url: url || undefined }); }
          catch {
            try { eb.setAuthor({ name: name.slice(0, 256), iconURL: icon || undefined }); }
            catch { eb.setAuthor({ name: name.slice(0, 256) }); }
          }
        }
        break;
      }
      case "field": {
        const parts = val.split("&&").map(s => s.trim());
        const fname = parts[0] ?? "";
        const fval = parts[1] ?? "";
        const finline = parts[2]?.toLowerCase();
        if (fname && fval) {
          try {
            eb.addFields({
              name: fname.slice(0, 256) || "\u200b",
              value: fval.slice(0, 1024) || "\u200b",
              inline: finline === "true" || finline === "inline",
            });
          } catch { /* ignore */ }
        }
        break;
      }
      // ── Button: {button: Label && https://... && style}
      // style is optional: primary | secondary | success | danger | link
      case "button": {
        const parts = val.split("&&").map(s => s.trim());
        const label = parts[0] ?? "";
        const urlOrId = parts[1] ?? "";
        const stylePart = parts[2] ?? "secondary";
        if (!label) break;
        const isLink = urlOrId.startsWith("http");
        const btn = new ButtonBuilder().setLabel(label.slice(0, 80));
        if (isLink) {
          btn.setStyle(ButtonStyle.Link).setURL(urlOrId);
        } else {
          btn.setStyle(resolveButtonStyle(stylePart)).setCustomId(urlOrId || `btn_${Date.now()}_${Math.random()}`);
        }
        pendingButtons.push(btn);
        break;
      }
      case "content": case "message": content = val; break;
    }
  }

  // Pack buttons into rows of up to 5
  const buttonRows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < pendingButtons.length && buttonRows.length < 5; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(pendingButtons.slice(i, i + 5));
    buttonRows.push(row);
  }

  return { eb, content, buttons: buttonRows };
}

// ── Main export ───────────────────────────────────────────────────────────────
export function parseScript(
  raw: string,
  ctx: ScriptingContext = {},
): { embeds: EmbedBuilder[]; content?: string; components: ActionRowBuilder<ButtonBuilder>[] } {
  const withVars = resolveVars(raw, ctx);
  const resolved = resolveEmojis(withVars, ctx);

  if (!resolved.includes("{embed}")) {
    return { embeds: [], content: applyNewlines(resolved), components: [] };
  }

  // Text before the first {embed} is plain message content, not an embed block
  const parts = resolved.split("{embed}");
  const plainText = parts[0].trim();
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

// ── Compat shim ───────────────────────────────────────────────────────────────
export function parseSingleScript(
  raw: string,
  ctx: ScriptingContext = {},
): { embed?: EmbedBuilder; content?: string; components: ActionRowBuilder<ButtonBuilder>[] } {
  const { embeds, content, components } = parseScript(raw, ctx);
  return { embed: embeds[0], content, components };
}
