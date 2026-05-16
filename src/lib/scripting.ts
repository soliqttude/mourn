import { EmbedBuilder, type GuildMember, type Guild, type User, type TextChannel } from "discord.js";

export interface ScriptingContext {
  user?: User | GuildMember | null;
  guild?: Guild | null;
  channel?: TextChannel | null;
  extra?: Record<string, string>;
}

function resolveVars(text: string, ctx: ScriptingContext): string {
  const user = ctx.user instanceof Object && "user" in ctx.user ? (ctx.user as GuildMember).user : ctx.user as User | null | undefined;
  const member = ctx.user instanceof Object && "roles" in ctx.user ? ctx.user as GuildMember : null;
  const guild = ctx.guild;

  const replacements: Record<string, string> = {
    "{user}": user?.displayName ?? user?.username ?? "Unknown",
    "{user.mention}": user ? `<@${user.id}>` : "Unknown",
    "{user.name}": user?.username ?? "Unknown",
    "{user.id}": user?.id ?? "0",
    "{user.avatar}": user?.displayAvatarURL() ?? "",
    "{user.tag}": user?.tag ?? "Unknown#0000",
    "{user.created_at}": user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` : "",
    "{guild}": guild?.name ?? "Unknown",
    "{guild.name}": guild?.name ?? "Unknown",
    "{guild.id}": guild?.id ?? "0",
    "{guild.icon}": guild?.iconURL() ?? "",
    "{guild.member_count}": guild?.memberCount?.toString() ?? "0",
    "{guild.boost_count}": guild?.premiumSubscriptionCount?.toString() ?? "0",
    "{channel}": ctx.channel ? `<#${ctx.channel.id}>` : "Unknown",
    "{channel.name}": ctx.channel?.name ?? "Unknown",
    "{channel.id}": ctx.channel?.id ?? "0",
    "{member.joined_at}": member ? `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:R>` : "",
    ...(ctx.extra ?? {}),
  };

  let result = text;
  for (const [k, v] of Object.entries(replacements)) {
    result = result.replaceAll(k, v);
  }
  return result;
}

export function parseScript(raw: string, ctx: ScriptingContext = {}): { embed?: EmbedBuilder; content?: string } {
  const resolved = resolveVars(raw, ctx);

  if (!resolved.trimStart().startsWith("{embed}")) {
    return { content: resolved };
  }

  const parts = resolved.replace(/^\{embed\}\$v/, "").split("$v");
  const eb = new EmbedBuilder();
  let content: string | undefined;

  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim().replace(/^\{/, "").toLowerCase();
    const val = part.slice(colon + 1).trimEnd().replace(/\}$/, "").trim();

    switch (key) {
      case "title": eb.setTitle(val); break;
      case "description": eb.setDescription(val); break;
      case "color": {
        const hex = parseInt(val.replace("#", ""), 16);
        if (!isNaN(hex)) eb.setColor(hex);
        break;
      }
      case "url": eb.setURL(val); break;
      case "image": eb.setImage(val); break;
      case "thumbnail": eb.setThumbnail(val); break;
      case "timestamp": eb.setTimestamp(); break;
      case "footer": {
        const [text, icon] = val.split("&&").map((s) => s.trim());
        eb.setFooter({ text: text ?? val, iconURL: icon });
        break;
      }
      case "author": {
        const [name, icon, url] = val.split("&&").map((s) => s.trim());
        eb.setAuthor({ name: name ?? val, iconURL: icon, url });
        break;
      }
      case "field": {
        const [name, value, inline] = val.split("&&").map((s) => s.trim());
        if (name && value) eb.addFields({ name, value, inline: inline === "true" || inline === "inline" });
        break;
      }
      case "message": content = val; break;
    }
  }

  return { embed: eb, content };
}
