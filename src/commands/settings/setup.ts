import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
  type CategoryChannel,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

type SetupType = "gambling" | "community" | "gaming" | "anime";
interface RoleCfg { name: string; color: number; hoist: boolean; permissions: bigint; }
interface CatCfg { name: string; channels: string[]; }
interface ServerCfg { emoji: string; categories: CatCfg[]; roles: RoleCfg[]; }

const MOD = PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers |
  PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ModerateMembers |
  PermissionFlagsBits.MuteMembers | PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages | PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.ManageChannels;
const MEMBER = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.ReadMessageHistory | PermissionFlagsBits.AddReactions |
  PermissionFlagsBits.UseExternalEmojis | PermissionFlagsBits.Connect | PermissionFlagsBits.Speak;
const MUTED = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory;

function hex(h: string): number { return parseInt(h.replace("#", ""), 16) || 0x5865f2; }

const PRESETS: Record<SetupType, ServerCfg> = {
  gambling: {
    emoji: "🎰",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "server-info"] },
      { name: "💬 GENERAL", channels: ["general", "introductions", "memes", "media"] },
      { name: "💰 ECONOMY", channels: ["bot-commands", "gambling", "heist", "leaderboard", "shop"] },
    ],
    roles: [
      { name: "👑 Admin", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator", color: 0xe67e22, hoist: true, permissions: MOD },
      { name: "💎 VIP", color: 0xffd700, hoist: true, permissions: MEMBER },
      { name: "💰 High Roller", color: 0xff6b35, hoist: true, permissions: MEMBER },
      { name: "🎰 Member", color: 0x8b0000, hoist: false, permissions: MEMBER },
      { name: "🔇 Muted", color: 0x555555, hoist: false, permissions: MUTED },
    ],
  },
  community: {
    emoji: "👥",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "roles", "server-info"] },
      { name: "💬 GENERAL", channels: ["general", "off-topic", "memes", "media", "introductions"] },
      { name: "🎮 ENTERTAINMENT", channels: ["bot-commands", "music", "suggestions"] },
    ],
    roles: [
      { name: "👑 Admin", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator", color: 0xe67e22, hoist: true, permissions: MOD },
      { name: "⭐ Verified", color: 0x5865f2, hoist: true, permissions: MEMBER },
      { name: "🌟 Active Member", color: 0x57f287, hoist: false, permissions: MEMBER },
      { name: "📝 Member", color: 0x99aab5, hoist: false, permissions: MEMBER },
      { name: "🔇 Muted", color: 0x555555, hoist: false, permissions: MUTED },
    ],
  },
  gaming: {
    emoji: "🎮",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "news"] },
      { name: "💬 GENERAL", channels: ["general", "off-topic", "introductions", "media"] },
      { name: "🎮 GAMING", channels: ["gaming", "clips", "lfg", "game-chat"] },
      { name: "🤖 BOT", channels: ["bot-commands", "music"] },
    ],
    roles: [
      { name: "👑 Admin", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator", color: 0xe67e22, hoist: true, permissions: MOD },
      { name: "🏆 Pro Gamer", color: 0xffd700, hoist: true, permissions: MEMBER },
      { name: "🎮 Gamer", color: 0x5865f2, hoist: true, permissions: MEMBER },
      { name: "📝 Member", color: 0x99aab5, hoist: false, permissions: MEMBER },
      { name: "🔇 Muted", color: 0x555555, hoist: false, permissions: MUTED },
    ],
  },
  anime: {
    emoji: "🌸",
    categories: [
      { name: "📋 INFORMATION", channels: ["rules", "announcements", "server-info"] },
      { name: "💬 GENERAL", channels: ["general", "introductions", "memes", "media"] },
      { name: "🌸 ANIME", channels: ["anime-discussion", "manga", "recommendations", "fan-art"] },
      { name: "🤖 BOT", channels: ["bot-commands", "music"] },
    ],
    roles: [
      { name: "👑 Admin", color: 0xe74c3c, hoist: true, permissions: PermissionFlagsBits.Administrator },
      { name: "⚔️ Moderator", color: 0xe67e22, hoist: true, permissions: MOD },
      { name: "🌸 Senpai", color: 0xff69b4, hoist: true, permissions: MEMBER },
      { name: "⭐ Weeb", color: 0x9b59b6, hoist: true, permissions: MEMBER },
      { name: "📝 Member", color: 0x99aab5, hoist: false, permissions: MEMBER },
      { name: "🔇 Muted", color: 0x555555, hoist: false, permissions: MUTED },
    ],
  },
};

async function callGemini(description: string): Promise<ServerCfg | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const prompt = [
    `You are setting up a Discord server. Description: "${description}"`,
    "Return ONLY valid JSON (no other text) matching this structure:",
    '{"emoji":"🎯","categories":[{"name":"CATEGORY NAME","channels":["channel-name","channel-name"]}],"roles":[{"name":"Role Name","color":"#hex","hoist":true,"tier":"admin|mod|vip|member|muted"}]}',
    "Rules: 3-4 categories, 2-5 channels each (lowercase, dashes, relevant to description). 5-7 roles always starting with Admin + Moderator, ending with Member + Muted. Use fitting emoji and colors.",
  ].join("\n");
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 900 } }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    // Convert AI roles to ServerCfg format
    const TIER_PERMS: Record<string, bigint> = {
      admin: PermissionFlagsBits.Administrator, mod: MOD,
      vip: MEMBER, member: MEMBER, muted: MUTED,
    };
    return {
      emoji: parsed.emoji ?? "🎯",
      categories: parsed.categories ?? [],
      roles: (parsed.roles ?? []).map((r: any) => ({
        name: r.name,
        color: hex(r.color ?? "#5865f2"),
        hoist: r.hoist ?? false,
        permissions: TIER_PERMS[r.tier ?? "member"] ?? MEMBER,
      })),
    };
  } catch { return null; }
}

export const command: HybridCommand = {
  name: "setup",
  aliases: ["serversetup"],
  description: "AI-powered server setup. ,setup <type|description> then ,setup roles.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "setup <gambling|community|gaming|anime|custom|roles> [description]",
  options: [
    {
      name: "type",
      description: "Preset type, 'custom' for AI, or 'roles' to create the role hierarchy",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "🎰 Gambling / Economy", value: "gambling" },
        { name: "👥 Community", value: "community" },
        { name: "🎮 Gaming", value: "gaming" },
        { name: "🌸 Anime", value: "anime" },
        { name: "🤖 Custom (AI-powered)", value: "custom" },
        { name: "🏷️ Roles only (use previous type)", value: "roles" },
      ],
    },
    {
      name: "description",
      description: "For custom AI: describe your server (e.g. 'A Minecraft survival community')",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const rawType = (ctx.getString("type") ?? ctx.args[0] ?? "").toLowerCase().trim();
    const descArg = ctx.getString("description") ?? ctx.args.slice(1).join(" ");

    if (!rawType) {
      return ctx.reply({
        embeds: [brandEmbed({
          title: "⚙️ Server Setup",
          description: [
            "**Step 1 — pick a server type:**",
            "  🎰 `,setup gambling`  — Economy server",
            "  👥 `,setup community` — Community server",
            "  🎮 `,setup gaming`    — Gaming server",
            "  🌸 `,setup anime`     — Anime server",
            "  🤖 `,setup custom A server about Minecraft` — AI-generated",
            "",
            "**Step 2 — create roles:**",
            "  🏷️ `,setup roles`",
            "",
            process.env.GEMINI_API_KEY
              ? "✅ AI mode is **enabled** (custom setup available)"
              : "⚠️ Add `GEMINI_API_KEY` to Railway to enable AI setup",
          ].join("\n"),
          page: "Setup",
        })],
      });
    }

    if (rawType === "roles") {
      const settings = await getGuildSettings(ctx.guild.id);
      const serverType = (settings as any).serverType as SetupType | null;
      if (!serverType || !PRESETS[serverType]) {
        return ctx.reply({ embeds: [errorEmbed("No server type saved. Run `,setup gambling` (or another type) first.")] });
      }
      await ctx.defer();
      return doRoles(ctx, PRESETS[serverType].roles, serverType);
    }

    const knownType = rawType as SetupType;
    const isPreset = knownType in PRESETS;

    // Determine if we go AI or preset
    let cfg: ServerCfg | null = null;
    let aiDescription = "";

    if (!isPreset || rawType === "custom") {
      // For prefix: treat rest of args as description; for slash: use description option
      aiDescription = isPreset ? descArg : (rawType + " " + descArg).trim();
      if (!aiDescription || aiDescription.length < 5) {
        if (!isPreset) {
          return ctx.reply({ embeds: [errorEmbed("Please provide a server description. Example: `,setup A Minecraft survival community`")] });
        }
      }
    }

    await ctx.defer();

    if (aiDescription && aiDescription.length >= 5) {
      cfg = await callGemini(aiDescription);
      if (!cfg) {
        if (isPreset) {
          cfg = PRESETS[knownType];
        } else {
          cfg = PRESETS["community"]; // fallback
          aiDescription = "";
        }
      }
    } else {
      cfg = PRESETS[knownType] ?? PRESETS["community"];
    }

    await updateGuildSettings(ctx.guild.id, { serverType: isPreset ? knownType : "community" } as any);
    return doChannels(ctx, cfg, aiDescription || rawType);
  },
};

async function doChannels(ctx: any, cfg: ServerCfg, label: string): Promise<void> {
  const guild = ctx.guild!;
  const created: string[] = [];
  const failed: string[] = [];

  for (const catDef of cfg.categories) {
    try {
      const cat = await guild.channels.create({ name: catDef.name, type: ChannelType.GuildCategory }) as CategoryChannel;
      created.push(`📂 **${catDef.name}**`);
      for (const ch of catDef.channels) {
        try {
          await guild.channels.create({ name: ch, type: ChannelType.GuildText, parent: cat.id });
          created.push(`  #${ch}`);
        } catch { failed.push(`#${ch}`); }
      }
    } catch { failed.push(catDef.name); }
  }

  const lines = [
    `${cfg.emoji} Server configured for **${label}**.`,
    "",
    "**Channels created:**",
    ...created.slice(0, 28),
    ...(created.length > 28 ? [`…and ${created.length - 28} more`] : []),
    ...(failed.length ? ["", `**Failed:** ${failed.join(", ")}`] : []),
    "",
    `Now run \`${ctx.prefix}setup roles\` to create the role hierarchy!`,
  ];

  await ctx.reply({ embeds: [brandEmbed({ title: `${cfg.emoji} Server Setup`, description: lines.join("\n"), page: "Setup" })] });
}

async function doRoles(ctx: any, roles: RoleCfg[], label: string): Promise<void> {
  const guild = ctx.guild!;
  const created: string[] = [];
  const failed: string[] = [];

  for (const r of roles) {
    try {
      await guild.roles.create({ name: r.name, color: r.color, hoist: r.hoist, permissions: r.permissions, reason: `Mourn setup ${label}` });
      created.push(r.name);
    } catch { failed.push(r.name); }
  }

  const lines = [
    `Created **${created.length}** roles:`,
    "",
    ...created.map(r => `✅ ${r}`),
    ...(failed.length ? ["", ...failed.map(r => `❌ ${r}`)] : []),
    "",
    "**Tip:** Go to Server Settings → Roles and drag them to the correct order.",
  ];

  await ctx.reply({ embeds: [brandEmbed({ title: "🏷️ Roles Created", description: lines.join("\n"), page: "Setup" })] });
}
