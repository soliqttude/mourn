import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "customize",
  aliases: ["botcustomize", "botcustom"],
  description: "customize the bot's avatar, banner, or bio for this server",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "customize <avatar|banner|bio|reset> [value]",
  examples: [
    "customize avatar https://i.imgur.com/example.png",
    "customize bio welcome to our server, powered by bleed",
    "customize banner https://i.imgur.com/banner.png",
    "customize reset",
  ],
  options: [
    {
      name: "field",
      description: "what to customize: avatar, banner, bio, or reset",
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
      description: "the new value (url for avatar/banner, text for bio)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const field = ctx.getString("field") ?? ctx.args[0]?.toLowerCase();
    const value = ctx.getString("value") ?? (ctx.args.slice(1).join(" ") || null);

    if (!field) {
      return ctx.reply({
        embeds: [errorEmbed("usage: `customize <avatar|banner|bio|reset> [value]`")],
      });
    }

    if (field === "reset") {
      await updateGuildSettings(ctx.guild.id, {
        customizeAvatar: null,
        customizeBanner: null,
        customizeBio: null,
      });
      return ctx.reply({ embeds: [successEmbed("bot customization has been reset.", "settings")] });
    }

    if (!value) {
      return ctx.reply({ embeds: [errorEmbed("please provide a value.")] });
    }

    if (field === "avatar") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("please provide a valid image url.")] });
      await updateGuildSettings(ctx.guild.id, { customizeAvatar: value });
    } else if (field === "banner") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("please provide a valid image url.")] });
      await updateGuildSettings(ctx.guild.id, { customizeBanner: value });
    } else if (field === "bio") {
      if (value.length > 190)
        return ctx.reply({ embeds: [errorEmbed("bio must be 190 characters or less.")] });
      await updateGuildSettings(ctx.guild.id, { customizeBio: value });
    } else {
      return ctx.reply({
        embeds: [errorEmbed("invalid option. use `avatar`, `banner`, `bio`, or `reset`.")],
      });
    }

    const s = await getGuildSettings(ctx.guild.id);
    return ctx.reply({
      embeds: [
        brandEmbed({
          description: [
            s.customizeAvatar ? `**avatar** — [link](${s.customizeAvatar})` : "**avatar** — default",
            s.customizeBanner ? `**banner** — [link](${s.customizeBanner})` : "**banner** — default",
            s.customizeBio    ? `**bio** — ${s.customizeBio}`               : "**bio** — not set",
          ].join("\n"),
          thumbnail: s.customizeAvatar ?? undefined,
          page: "settings",
        }),
      ],
    });
  },
};
