import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { userProfiles } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "𝕏", instagram: "📷", github: "🐙", twitch: "🎮", youtube: "▶️",
  tiktok: "🎵", steam: "🎮", spotify: "🎧", linkedin: "💼", website: "🌐",
};

export const command: HybridCommand = {
  name: "socials",
  description: "Manage your social links.",
  usage: "socials [add <platform> <link>] [remove <platform>] [@user]",
  examples: ["socials", "socials add twitter @myhandle", "socials remove twitter", "socials @user"],
  category: "social",
  options: [
    { name: "subcommand", description: "add | remove | list", type: ApplicationCommandOptionType.String, required: false },
    { name: "platform", description: "Platform name (twitter, instagram, github, etc.)", type: ApplicationCommandOptionType.String, required: false },
    { name: "link", description: "Your link or username", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "User to view socials of", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const sub = ctx.getString("subcommand")?.toLowerCase();
    const targetUser = await ctx.getUser("user");

    if (!sub || sub === "list" || targetUser) {
      const target = targetUser ?? ctx.user;
      const row = await db.select().from(userProfiles).where(eq(userProfiles.userId, target.id)).then(r => r[0] ?? null);
      const socials = (row?.socials ?? {}) as Record<string, string>;
      const lines = Object.entries(socials).map(([k, v]) => {
        const icon = PLATFORM_ICONS[k] ?? "🔗";
        return `${icon} **${k}** — ${v}`;
      });
      return ctx.reply({
        embeds: [
          brandEmbed({
            description: lines.length ? lines.join("\n") : `*no socials set. use \`,socials add <platform> <link>\` to add some!*`,
            authorName: `${target.globalName ?? target.username}'s socials`,
            authorIcon: target.displayAvatarURL({ size: 64 }),
          }),
        ],
      });
    }

    if (sub === "remove") {
      let plat = ctx.getString("platform")?.toLowerCase();
      if (!plat && ctx.source === "prefix") plat = ctx.rawArgs.replace(/^remove\s+/i, "").trim().toLowerCase();
      if (!plat) return ctx.reply({ embeds: [errorEmbed("provide a platform to remove.")] });
      const row = await db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).then(r => r[0] ?? null);
      const socials = { ...((row?.socials ?? {}) as Record<string, string>) };
      if (!socials[plat]) return ctx.reply({ embeds: [errorEmbed(`no **${plat}** link found.`)] });
      delete socials[plat];
      await db.insert(userProfiles).values({ userId: ctx.user.id, socials })
        .onConflictDoUpdate({ target: userProfiles.userId, set: { socials, updatedAt: new Date() } });
      return ctx.reply({ embeds: [successEmbed(`removed **${plat}** from your socials.`)] });
    }

    if (sub === "add") {
      let plat = ctx.getString("platform")?.toLowerCase();
      let val = ctx.getString("link");
      if (ctx.source === "prefix" && (!plat || !val)) {
        const parts = ctx.rawArgs.replace(/^add\s+/i, "").trim().split(/\s+/);
        plat = parts[0]?.toLowerCase();
        val = parts.slice(1).join(" ");
      }
      if (!plat) return ctx.reply({ embeds: [errorEmbed("provide a platform name. example: `,socials add twitter @handle`")] });
      if (!val) return ctx.reply({ embeds: [errorEmbed("provide a link or username.")] });
      if (val.length > 100) return ctx.reply({ embeds: [errorEmbed("link too long (max 100 chars).")] });
      const row = await db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).then(r => r[0] ?? null);
      const socials = { ...((row?.socials ?? {}) as Record<string, string>), [plat]: val };
      if (Object.keys(socials).length > 10) return ctx.reply({ embeds: [errorEmbed("max 10 socials allowed.")] });
      await db.insert(userProfiles).values({ userId: ctx.user.id, socials })
        .onConflictDoUpdate({ target: userProfiles.userId, set: { socials, updatedAt: new Date() } });
      return ctx.reply({ embeds: [successEmbed(`added **${plat}:** ${val}`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("usage: `,socials add <platform> <link>` | `,socials remove <platform>` | `,socials @user`")] });
  },
};
