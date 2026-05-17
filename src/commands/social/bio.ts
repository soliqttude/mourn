import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { userProfiles } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "bio",
  description: "Set or view a profile bio. Usage: ,bio set <text> | ,bio clear | ,bio [@user]",
  usage: "bio [subcommand] [text] [user]",
  examples: ["bio"],
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
      const bio = row?.bio ?? "*No bio set.*";
      const socials = (row?.socials ?? {}) as Record<string, string>;
      const socialLines = Object.entries(socials).map(([k, v]) => `**${k}:** ${v}`);
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.brandColor)
            .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
            .setDescription(bio)
            .addFields(socialLines.length ? [{ name: "\uD83D\uDD17 Socials", value: socialLines.join("\n") }] : [])
            .setFooter({ text: config.embedFooter })
            .setTimestamp(),
        ],
      });
    }

    if (sub === "clear") {
      await db.delete(userProfiles).where(eq(userProfiles.userId, ctx.user.id));
      return ctx.reply({ embeds: [successEmbed("Bio cleared.")] });
    }

    if (sub === "set") {
      let bioText = textArg;
      if (!bioText && ctx.source === "prefix") bioText = ctx.rawArgs.replace(/^set\s+/i, "").trim();
      if (!bioText) return ctx.reply({ embeds: [errorEmbed("Provide a bio. Example: `,bio set I love this server!`")] });
      if (bioText.length > 150) return ctx.reply({ embeds: [errorEmbed(`Bio too long (${bioText.length}/150 chars).`)] });
      await db.insert(userProfiles).values({ userId: ctx.user.id, bio: bioText })
        .onConflictDoUpdate({ target: userProfiles.userId, set: { bio: bioText, updatedAt: new Date() } });
      return ctx.reply({ embeds: [successEmbed("Bio saved! Use `,bio` to view it.")] });
    }

    if (ctx.source === "prefix") {
      const bioText = ctx.rawArgs.trim();
      if (!bioText) return ctx.reply({ embeds: [errorEmbed("Usage: `,bio set <text>` | `,bio clear` | `,bio [@user]`")] });
      if (bioText.length > 150) return ctx.reply({ embeds: [errorEmbed(`Bio too long (${bioText.length}/150 chars).`)] });
      await db.insert(userProfiles).values({ userId: ctx.user.id, bio: bioText })
        .onConflictDoUpdate({ target: userProfiles.userId, set: { bio: bioText, updatedAt: new Date() } });
      return ctx.reply({ embeds: [successEmbed("Bio saved!")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Usage: `,bio set <text>` | `,bio clear` | `,bio [@user]`")] });
  },
};
