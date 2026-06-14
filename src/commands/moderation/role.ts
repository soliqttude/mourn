import { ApplicationCommandOptionType, type Guild, type GuildMember, type Role } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

async function findMember(guild: Guild, query: string): Promise<GuildMember | null> {
  const idMatch = query.match(/^<@!?(\d+)>$/) ?? query.match(/^(\d+)$/);
  if (idMatch) return guild.members.fetch(idMatch[1]!).catch(() => null);
  const q = query.toLowerCase();
  const fetched = await guild.members.fetch({ query: q, limit: 5 }).catch(() => null);
  if (fetched?.size) return fetched.first() ?? null;
  return (
    guild.members.cache.find((m) => m.user.username.toLowerCase() === q) ??
    guild.members.cache.find((m) => m.displayName.toLowerCase() === q) ??
    guild.members.cache.find((m) => m.user.username.toLowerCase().includes(q)) ??
    guild.members.cache.find((m) => m.displayName.toLowerCase().includes(q)) ??
    null
  );
}

function findRole(guild: Guild, query: string): Role | null {
  const mentionMatch = query.match(/^<@&(\d+)>$/);
  if (mentionMatch) return guild.roles.cache.get(mentionMatch[1]!) ?? null;
  if (/^\d+$/.test(query)) return guild.roles.cache.get(query) ?? null;
  const q = query.toLowerCase();
  return (
    guild.roles.cache.find((r) => r.name.toLowerCase() === q) ??
    guild.roles.cache.find((r) => r.name.toLowerCase().includes(q)) ??
    null
  );
}

function resolveIcon(raw: string): string | null {
  if (!raw || raw === "none" || raw === "reset" || raw === "remove") return null;

  // Custom emoji: <:name:id> or <a:name:id>
  const customEmoji = raw.match(/^<a?:\w+:(\d+)>$/);
  if (customEmoji) {
    const animated = raw.startsWith("<a:");
    return `https://cdn.discordapp.com/emojis/${customEmoji[1]}.${animated ? "gif" : "png"}`;
  }

  // Image URL
  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(raw)) return raw;

  // Unicode emoji — pass through directly (discord.js accepts it)
  return raw;
}

export const command: HybridCommand = {
  name: "role",
  aliases: ["r", "giverole", "gr", "addrole"],
  description: "Add or remove a role from a member. Use `icon` subcommand to set a role icon.",
  usage: "role [user] [role] | role icon [role] [emoji/url/reset]",
  examples: [
    "role @user @role",
    "role icon @admin 👑",
    "role icon @mod <:custom:123456>",
    "role icon @vip reset",
  ],
  category: "moderation",
  permission: "manage_roles",
  guildOnly: true,
  options: [
    { name: "user", description: "Member", type: ApplicationCommandOptionType.User, required: true },
    { name: "role", description: "Role",   type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    // ── icon subcommand ─────────────────────────────────────────────────────
    // prefix: ,r icon @role 🔥   (args[0] = "icon")
    if (ctx.source === "prefix" && ctx.args[0]?.toLowerCase() === "icon") {
      const roleArg = ctx.args[1];
      const iconRaw = ctx.args.slice(2).join(" ").trim();

      if (!roleArg) return ctx.reply({ embeds: [errorEmbed("Usage: `,r icon (role) (emoji/url/reset)`")] });

      const role = findRole(ctx.guild, roleArg);
      if (!role) return ctx.reply({ embeds: [errorEmbed("I can't find that **role**.")] });
      if (role.managed) return ctx.reply({ embeds: [errorEmbed("That **role** is managed by an integration.")] });
      if (role.position >= (ctx.guild.members.me?.roles.highest.position ?? 0)) {
        return ctx.reply({ embeds: [errorEmbed("That **role** is above my highest **role**.")] });
      }

      const removing = !iconRaw || iconRaw === "none" || iconRaw === "reset" || iconRaw === "remove";

      if (!removing && !iconRaw) {
        return ctx.reply({ embeds: [errorEmbed("Provide an **emoji**, **image URL**, or `reset` to remove the icon.")] });
      }

      try {
        if (removing) {
          await role.setIcon(null);
          return ctx.reply({
            embeds: [successEmbed(`removed icon from <@&${role.id}>`)],
            allowedMentions: { parse: [] },
          });
        }

        const resolved = resolveIcon(iconRaw);

        // Unicode emoji path
        if (resolved && !/^https?:\/\//.test(resolved)) {
          await role.setIcon(resolved);
        } else if (resolved) {
          // Fetch image and pass as buffer
          const res = await fetch(resolved);
          if (!res.ok) return ctx.reply({ embeds: [errorEmbed("couldn't fetch that image.")] });
          const buf = Buffer.from(await res.arrayBuffer());
          await role.setIcon(buf);
        }

        return ctx.reply({
          embeds: [successEmbed(`set icon for <@&${role.id}> — ${iconRaw}`)],
          allowedMentions: { parse: [] },
        });
      } catch (err: any) {
        const msg: string = err?.message ?? String(err);
        if (msg.includes("GUILD_PREMIUM_TIER_REQUIRED") || msg.includes("50074")) {
          return ctx.reply({ embeds: [errorEmbed("role icons require **server boost level 2** (7 boosts).")] });
        }
        return ctx.reply({ embeds: [errorEmbed(msg.toLowerCase())] });
      }
    }

    // ── add/remove role ─────────────────────────────────────────────────────
    let target: GuildMember | null = null;
    let role: Role | null = null;

    try { target = await ctx.getMember("user", true); } catch { /* fallback */ }
    try { role = ctx.getRole("role") as Role | null; } catch { /* fallback */ }

    if (!target && ctx.args[0]) target = await findMember(ctx.guild, ctx.args[0]);
    if (!role && ctx.args.length >= 2) role = findRole(ctx.guild, ctx.args.slice(1).join(" "));

    if (!target) return ctx.reply({ embeds: [errorEmbed("I can't find that **member**.")] });
    if (!role)   return ctx.reply({ embeds: [errorEmbed("I can't find that **role**.")] });

    if (!ctx.guild.members.me?.permissions.has("ManageRoles")) {
      return ctx.reply({ embeds: [errorEmbed("I don't have **manage roles** **permission**.")] });
    }
    if (role.position >= (ctx.guild.members.me?.roles.highest.position ?? 0)) {
      return ctx.reply({ embeds: [errorEmbed("That **role** is above my highest **role**.")] });
    }
    if (role.managed) {
      return ctx.reply({ embeds: [errorEmbed("That **role** is managed by an integration.")] });
    }

    try {
      if (target.roles.cache.has(role.id)) {
        await target.roles.remove(role.id);
        return ctx.reply({
          embeds: [successEmbed(`removed <@&${role.id}> from <@${target.id}>`)],
          allowedMentions: { parse: [] },
        });
      }
      await target.roles.add(role.id);
      return ctx.reply({
        embeds: [successEmbed(`added <@&${role.id}> to <@${target.id}>`)],
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message.toLowerCase())] });
    }
  },
};
