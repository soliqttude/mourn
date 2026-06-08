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

export const command: HybridCommand = {
  name: "role",
  aliases: ["r", "giverole", "gr", "addrole"],
  description: "Add or remove a role from a member.",
  usage: "role [user] [role]",
  examples: ["role eh king", "role @user @role"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member", type: ApplicationCommandOptionType.User, required: true },
    { name: "role", description: "Role", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    let target: GuildMember | null = null;
    let role: Role | null = null;

    // Try slash/mention-based resolution first, then fall back to name matching
    try { target = await ctx.getMember("user", true); } catch { /* fallback below */ }
    try { role = ctx.getRole("role") as Role | null; } catch { /* fallback below */ }

    if (!target && ctx.args[0]) {
      target = await findMember(ctx.guild, ctx.args[0]);
    }
    if (!role && ctx.args.length >= 2) {
      role = findRole(ctx.guild, ctx.args.slice(1).join(" "));
    }

    if (!target) return ctx.reply({ embeds: [errorEmbed("i can't find that member.")] });
    if (!role)   return ctx.reply({ embeds: [errorEmbed("i can't find that role.")] });

    if (!ctx.guild.members.me?.permissions.has("ManageRoles")) {
      return ctx.reply({ embeds: [errorEmbed("i don't have **manage roles** permission.")] });
    }
    if (role.position >= (ctx.guild.members.me?.roles.highest.position ?? 0)) {
      return ctx.reply({ embeds: [errorEmbed("that role is above my highest role.")] });
    }
    if (role.managed) {
      return ctx.reply({ embeds: [errorEmbed("that role is managed by an integration.")] });
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
