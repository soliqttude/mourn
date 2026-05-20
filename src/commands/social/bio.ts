import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { userProfiles } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "bio",
  description: "Set or view a profile bio.",
  usage: "bio [set <text>] [clear] [@user]",
  examples: ["bio", "bio set I love this server!", "bio clear", "bio @user"],
  category: "social",
  options: [
    { name: "subcommand", description: "set | clear", type: ApplicationCommandOptionType.String, required: false },
    { name: "text", description: "Your bio text (max 150 chars)", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "User whose bio to view", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const sub = ctx.getString("subcommand")?.toLowerCase();
    const targetUser = await ctx.getUser("user");
    const textArg = ctx.getString("text");

    if (!sub || sub === "view" || targetUser) {
      const target = targetUser ?? ctx.user;
      const row = await db.select().from(userProfiles).where(eq(userProfiles.userId, target.id)).then(r => r[0] ?? null);
      const bio = row?.bio ?? "*no bio set.*";
      const socials = (row?.socials ?? {}) as Record<string, string>;
      const socialLines = Object.entries(socials).map(([k, v]) => `**${k}:** ${v}`);
      const desc = [bio, socialLines.length ? `\n${socialLines.join("\n")}` : null].filter(Boolean).join("");
      return ctx.reply({
        embeds: [
          brandEmbed({
            description: desc,
            authorName: target.globalName ?? target.username,
            authorIcon: target.displayAvatarURL({ size: 64 }),
            thumbnail: target.displayAvatarURL({ size: 256 }),
          }),
        ],
      });
    }

    if (sub === "clear") {
      await db.delete(userProfiles).where(eq(userProfiles.userId, ctx.user.id));
      return ctx.reply({ embeds: [successEmbed("bio cleared.")] });
    }

    if (sub === "set") {
      let bioText = textArg;
      if (!bioText && ctx.source === "prefix") bioText = ctx.rawArgs.replace(/^set\s+/i, "").trim();
      if (!bioText) return ctx.reply({ embeds: [errorEmbed("provide a bio. example: `,bio set i love this server!`")] });
      if (bioText.length > 150) return ctx.reply({ embeds: [errorEmbed(`bio too long (${bioText.length}/150 chars).`)] });
      await db.insert(userProfiles).values({ userId: ctx.user.id, bio: bioText })
        .onConflictDoUpdate({ target: userProfiles.userId, set: { bio: bioText, updatedAt: new Date() } });
      return ctx.reply({ embeds: [successEmbed("bio saved.")] });
    }

    if (ctx.source === "prefix") {
      const bioText = ctx.rawArgs.trim();
      if (!bioText) return ctx.reply({ embeds: [errorEmbed("usage: `,bio set <text>` | `,bio clear` | `,bio @user`")] });
      if (bioText.length > 150) return ctx.reply({ embeds: [errorEmbed(`bio too long (${bioText.length}/150 chars).`)] });
      await db.insert(userProfiles).values({ userId: ctx.user.id, bio: bioText })
        .onConflictDoUpdate({ target: userProfiles.userId, set: { bio: bioText, updatedAt: new Date() } });
      return ctx.reply({ embeds: [successEmbed("bio saved.")] });
    }

    return ctx.reply({ embeds: [errorEmbed("usage: `,bio set <text>` | `,bio clear` | `,bio @user`")] });
  },
};
