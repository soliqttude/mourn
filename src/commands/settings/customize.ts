import { ApplicationCommandOptionType, REST } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

async function urlToDataUri(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "BleedBot/1.0" } });
  if (!res.ok) throw new Error(`could not fetch image (${res.status})`);
  const ct = res.headers.get("content-type") ?? "image/png";
  if (!ct.startsWith("image/")) throw new Error("url must point to an image");
  const buf = await res.arrayBuffer();
  return `data:${ct};base64,${Buffer.from(buf).toString("base64")}`;
}

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

    const rest = new REST({ version: "10" }).setToken(config.token);
    const endpoint = `/guilds/${ctx.guild.id}/members/@me`;

    if (field === "reset") {
      await rest.patch(endpoint, { body: { avatar: null, banner: null } }).catch(() => {});
      await updateGuildSettings(ctx.guild.id, {
        customizeAvatar: null,
        customizeBanner: null,
        customizeBio: null,
      });
      return ctx.reply({ embeds: [successEmbed("server customization has been reset.", "settings")] });
    }

    if (!value) {
      return ctx.reply({ embeds: [errorEmbed("please provide a value.")] });
    }

    if (field === "avatar") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("please provide a valid image url.")] });
      let dataUri: string;
      try {
        dataUri = await urlToDataUri(value);
      } catch (err) {
        return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
      }
      try {
        await rest.patch(endpoint, { body: { avatar: dataUri } });
      } catch {
        return ctx.reply({ embeds: [errorEmbed("discord rejected the avatar — make sure the image is under 10mb and is png/jpg/gif/webp.")] });
      }
      await updateGuildSettings(ctx.guild.id, { customizeAvatar: value });
      return ctx.reply({ embeds: [successEmbed("server avatar updated.", "settings")] });
    }

    if (field === "banner") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("please provide a valid image url.")] });
      let dataUri: string;
      try {
        dataUri = await urlToDataUri(value);
      } catch (err) {
        return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
      }
      try {
        await rest.patch(endpoint, { body: { banner: dataUri } });
      } catch {
        return ctx.reply({ embeds: [errorEmbed("discord rejected the banner — make sure the image is under 10mb and is png/jpg/gif/webp.")] });
      }
      await updateGuildSettings(ctx.guild.id, { customizeBanner: value });
      return ctx.reply({ embeds: [successEmbed("server banner updated.", "settings")] });
    }

    if (field === "bio") {
      if (value.length > 190)
        return ctx.reply({ embeds: [errorEmbed("bio must be 190 characters or less.")] });
      await updateGuildSettings(ctx.guild.id, { customizeBio: value });
      return ctx.reply({ embeds: [successEmbed(`bio updated — **${value}**`, "settings")] });
    }

    return ctx.reply({
      embeds: [errorEmbed("invalid option. use `avatar`, `banner`, `bio`, or `reset`.")],
    });
  },
};
