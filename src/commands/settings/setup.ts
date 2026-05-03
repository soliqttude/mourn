import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
  type CategoryChannel,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

// ── Types ─────────────────────────────────────────────────────────────────
type SetupType = "gambling" | "community" | "gaming" | "anime";

interface RoleConfig {
  name: string;
  color: number;
  hoist: boolean;
  permissions: bigint;
}

interface ServerConfig {
  emoji: string;
  description: string;
  categories: { name: string; channels: string[] }[];
  roles: RoleConfig[];
}

// ── Permission shorthands ─────────────────────────────────────────────────
const MOD_PERMS =
  PermissionFlagsBits.BanMembers |
  PermissionFlagsBits.KickMembers |
  PermissionFlagsBits.ManageMessages |
  PermissionFlagsBits.ModerateMembers |
  PermissionFlagsBits.MuteMembers |
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.ManageChannels;

const MEMBER_PERMS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.AddReactions |
  PermissionFlagsBits.UseExternalEmojis |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak;

const MUTED_PERMS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.ReadMessageHistory;

// ── Server presets ────────────────────────────────────────────────────────
const CONFIGS: Record<SetupType, ServerConfig> = {
  gambling: {
    emoji: "🎰",
    description: "Economy & gambling server",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "server-info"] },
      { name: "💬 GENERAL", channels: ["general", "introductions", "memes", "media"] },
      { name: "💰 ECONOMY", channels: ["bot-commands", "gambling", "heist", "leaderboard", "shop"] },
    ],
    roles: [
      { name: "👑 Admin",       color: 0xe74c3c, hoist: true,  permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator",  color: 0xe67e22, hoist: true,  permissions: MOD_PERMS },
      { name: "💎 VIP",         color: 0xffd700, hoist: true,  permissions: MEMBER_PERMS },
      { name: "💰 High Roller", color: 0xff6b35, hoist: true,  permissions: MEMBER_PERMS },
      { name: "🎰 Member",      color: 0x8b0000, hoist: false, permissions: MEMBER_PERMS },
      { name: "🔇 Muted",       color: 0x555555, hoist: false, permissions: MUTED_PERMS },
    ],
  },
  community: {
    emoji: "👥",
    description: "General community server",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "roles", "server-info"] },
      { name: "💬 GENERAL",     channels: ["general", "off-topic", "memes", "media", "introductions"] },
      { name: "🎮 ENTERTAINMENT", channels: ["bot-commands", "music", "suggestions"] },
    ],
    roles: [
      { name: "👑 Admin",         color: 0xe74c3c, hoist: true,  permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator",    color: 0xe67e22, hoist: true,  permissions: MOD_PERMS },
      { name: "⭐ Verified",      color: 0x5865f2, hoist: true,  permissions: MEMBER_PERMS },
      { name: "🌟 Active Member", color: 0x57f287, hoist: false, permissions: MEMBER_PERMS },
      { name: "📝 Member",        color: 0x99aab5, hoist: false, permissions: MEMBER_PERMS },
      { name: "🔇 Muted",         color: 0x555555, hoist: false, permissions: MUTED_PERMS },
    ],
  },
  gaming: {
    emoji: "🎮",
    description: "Gaming community server",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "news"] },
      { name: "💬 GENERAL",     channels: ["general", "off-topic", "introductions", "media"] },
      { name: "🎮 GAMING",      channels: ["gaming", "clips", "lfg", "game-chat"] },
      { name: "🤖 BOT",         channels: ["bot-commands", "music"] },
    ],
    roles: [
      { name: "👑 Admin",     color: 0xe74c3c, hoist: true,  permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator",color: 0xe67e22, hoist: true,  permissions: MOD_PERMS },
      { name: "🏆 Pro Gamer", color: 0xffd700, hoist: true,  permissions: MEMBER_PERMS },
      { name: "🎮 Gamer",     color: 0x5865f2, hoist: true,  permissions: MEMBER_PERMS },
      { name: "📝 Member",    color: 0x99aab5, hoist: false, permissions: MEMBER_PERMS },
      { name: "🔇 Muted",     color: 0x555555, hoist: false, permissions: MUTED_PERMS },
    ],
  },
  anime: {
    emoji: "🌸",
    description: "Anime & manga server",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "server-info"] },
      { name: "💬 GENERAL",     channels: ["general", "introductions", "memes", "media"] },
      { name: "🌸 ANIME",       channels: ["anime-discussion", "manga", "recommendations", "fan-art"] },
      { name: "🤖 BOT",         channels: ["bot-commands", "music"] },
    ],
    roles: [
      { name: "👑 Admin",    color: 0xe74c3c, hoist: true,  permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator",color: 0xe67e22, hoist: true, permissions: MOD_PERMS },
      { name: "🌸 Senpai",   color: 0xff69b4, hoist: true,  permissions: MEMBER_PERMS },
      { name: "⭐ Weeb",     color: 0x9b59b6, hoist: true,  permissions: MEMBER_PERMS },
      { name: "📝 Member",   color: 0x99aab5, hoist: false, permissions: MEMBER_PERMS },
      { name: "🔇 Muted",    color: 0x555555, hoist: false, permissions: MUTED_PERMS },
    ],
  },
};

const SETUP_TYPES = Object.keys(CONFIGS);

// ── Command ────────────────────────────────────────────────────────────────
export const command: HybridCommand = {
  name: "setup",
  aliases: ["serversetup"],
  description: "Set up your server. Run ,setup <type> first, then ,setup roles.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "setup <gambling|community|gaming|anime|roles>",
  options: [
    {
      name: "type",
      description: "Server type to set up, or 'roles' to create the role hierarchy",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "🎰 Gambling / Economy", value: "gambling" },
        { name: "👥 Community",          value: "community" },
        { name: "🎮 Gaming",             value: "gaming" },
        { name: "🌸 Anime",              value: "anime" },
        { name: "🏷️ Roles only",        value: "roles" },
      ],
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const type = (ctx.getString("type") ?? ctx.args[0] ?? "").toLowerCase();

    if (!type) {
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "⚙️ Server Setup",
            description: [
              "Set up channels and roles for your server in two steps:",
              "",
              "**Step 1 — pick a server type:**",
              "  🎰 `setup gambling`  — Economy & gambling",
              "  👥 `setup community` — General community",
              "  🎮 `setup gaming`    — Gaming community",
              "  🌸 `setup anime`     — Anime & manga",
              "",
              "**Step 2 — create the role hierarchy:**",
              "  🏷️ `setup roles` — Creates roles with the right permissions",
            ].join("\n"),
            page: "Setup",
          }),
        ],
      });
    }

    // ── setup roles ──────────────────────────────────────────────────────
    if (type === "roles") {
      const settings = await getGuildSettings(ctx.guild.id);
      const serverType = (settings as any).serverType as SetupType | null;
      if (!serverType || !CONFIGS[serverType]) {
        return ctx.reply({
          embeds: [
            errorEmbed(
              "No server type saved yet. Run `,setup gambling` (or another type) first, then `,setup roles`."
            ),
          ],
        });
      }
      await ctx.defer();
      return createRoles(ctx, serverType);
    }

    // ── server type setup ────────────────────────────────────────────────
    if (!SETUP_TYPES.includes(type)) {
      return ctx.reply({
        embeds: [
          errorEmbed(
            `Unknown type \`${type}\`. Choose: ${SETUP_TYPES.join(", ")} or \`roles\`.`
          ),
        ],
      });
    }

    await ctx.defer();
    return createServer(ctx, type as SetupType);
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
async function createServer(ctx: any, type: SetupType): Promise<void> {
  const guild = ctx.guild!;
  const cfg = CONFIGS[type];
  const created: string[] = [];
  const failed: string[] = [];

  await updateGuildSettings(guild.id, { serverType: type } as any);

  for (const catDef of cfg.categories) {
    try {
      const cat = (await guild.channels.create({
        name: catDef.name,
        type: ChannelType.GuildCategory,
      })) as CategoryChannel;
      created.push(`📂 **${catDef.name}**`);
      for (const ch of catDef.channels) {
        try {
          await guild.channels.create({ name: ch, type: ChannelType.GuildText, parent: cat.id });
          created.push(`  #${ch}`);
        } catch {
          failed.push(`#${ch}`);
        }
      }
    } catch {
      failed.push(`Category: ${catDef.name}`);
    }
  }

  const lines = [
    `Server type set to **${cfg.emoji} ${type}**.`,
    "",
    "**Channels created:**",
    ...created.slice(0, 30),
    ...(created.length > 30 ? [`…and ${created.length - 30} more`] : []),
    ...(failed.length ? ["", `**Failed:** ${failed.join(", ")}`] : []),
    "",
    `Now run \`${ctx.prefix}setup roles\` to create the role hierarchy!`,
  ];

  await ctx.reply({
    embeds: [
      brandEmbed({
        title: `${cfg.emoji} Server Setup — ${type}`,
        description: lines.join("\n"),
        page: "Setup",
      }),
    ],
  });
}

async function createRoles(ctx: any, type: SetupType): Promise<void> {
  const guild = ctx.guild!;
  const cfg = CONFIGS[type];
  const created: string[] = [];
  const failed: string[] = [];

  for (const role of cfg.roles) {
    try {
      await guild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        permissions: role.permissions,
        reason: `Mourn ,setup ${type} — role hierarchy`,
      });
      created.push(role.name);
    } catch {
      failed.push(role.name);
    }
  }

  const lines = [
    `Created **${created.length}** roles for your **${cfg.emoji} ${type}** server:`,
    "",
    ...created.map((r) => `✅ ${r}`),
    ...(failed.length ? ["", ...failed.map((r) => `❌ ${r} — failed (check bot permissions)`)] : []),
    "",
    "**Tip:** Go to Server Settings → Roles and drag them into the right order.",
    "Assign **Admin** near the top, and **Muted** near the bottom.",
    "",
    `Use \`,setrole <@member> <role>\` or \`,autorole\` to auto-assign roles.`,
  ];

  await ctx.reply({
    embeds: [
      brandEmbed({
        title: `${cfg.emoji} Roles Created — ${type}`,
        description: lines.join("\n"),
        page: "Setup",
      }),
    ],
  });
}
