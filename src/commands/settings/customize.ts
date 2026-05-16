import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { guildSettings } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "customize",
  aliases: ["botcustomize", "botcustom"],
  description: "Customize the bot's displayed avatar, banner URL, or bio for this server.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "customize (avatar|banner|bio|reset) [value]",
  examples: [
    "customize avatar https://i.imgur.com/example.png",
    "customize bio Welcome to our server, powered by Bleed",
    "customize banner https://i.imgur.com/banner.png",
    "customize reset",
  ],
  options: [
    {
      name: "field",
      description: "What to customize: avatar, banner, bio, or reset",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "avatar", value: "avatar" },
        { name: "banner", value: "banner" },
        { name: "bio", value: "bio" },
        { name: "reset", value: "reset" },
      ],
    },
    {
      name: "value",
      description: "The new value (URL for avatar/banner, text for bio)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const field = ctx.getString("field");
    const value = ctx.getString("value");

    if (field === "reset") {
      await db.insert(guildSettings).values({
        guildId: guild.id,
        customizeAvatar: null,
        customizeBanner: null,
        customizeBio: null,
      }).onConflictDoUpdate({
        target: guildSettings.guildId,
        set: { customizeAvatar: null, customizeBanner: null, customizeBio: null },
      });
      return ctx.reply({ embeds: [successEmbed("bot customization has been reset.", "settings")] });
    }

    if (!value) return ctx.reply({ embeds: [errorEmbed("please provide a value.")] });

    const set: Record<string, string | null> = {};

    if (field === "avatar") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("please provide a valid image url.")] });
      set.customizeAvatar = value;
    } else if (field === "banner") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("please provide a valid image url.")] });
      set.customizeBanner = value;
    } else if (field === "bio") {
      if (value.length > 190)
        return ctx.reply({ embeds: [errorEmbed("bio must be 190 characters or less.")] });
      set.customizeBio = value;
    } else {
      return ctx.reply({ embeds: [errorEmbed("invalid field. use avatar, banner, bio, or reset.")] });
    }

    await db.insert(guildSettings).values({ guildId: guild.id, ...set })
      .onConflictDoUpdate({ target: guildSettings.guildId, set });

    const rows = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guild.id));
    const s = rows[0];

    return ctx.reply({
      embeds: [brandEmbed({
        description: [
          `**bot customization updated**`,
          ``,
          s?.customizeAvatar ? `**avatar** — [link](${s.customizeAvatar})` : "**avatar** — default",
          s?.customizeBanner ? `**banner** — [link](${s.customizeBanner})` : "**banner** — default",
          s?.customizeBio ? `**bio** — ${s.customizeBio}` : "**bio** — not set",
        ].join("\n"),
        thumbnail: s?.customizeAvatar ?? undefined,
        page: "settings",
      })],
    });
  },
};
