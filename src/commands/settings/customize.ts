import { ApplicationCommandOptionType, REST } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

function validateImageUrl(url: string): void {
  // Catch common Imgur mistakes: album/image page URLs instead of direct links
  if (/^https?:\/\/(www\.)?imgur\.com\/(a|gallery)\//.test(url)) {
    throw new Error(
      "that's an imgur **album** link, not a direct image url.\n" +
      "open the album, click the image you want, then copy the url from the address bar — it should look like `https://i.imgur.com/XXXXXXX.png`"
    );
  }
  if (/^https?:\/\/(www\.)?imgur\.com\/[A-Za-z0-9]+$/.test(url)) {
    const id = url.split("/").pop();
    throw new Error(
      `that's an imgur page link, not a direct image url.\n` +
      `use the direct link instead: \`https://i.imgur.com/${id}.png\``
    );
  }
}

async function urlToDataUri(url: string): Promise<string> {
  validateImageUrl(url);
  const res = await fetch(url, { headers: { "User-Agent": "BleedBot/1.0" } });
  if (!res.ok) throw new Error(`could not fetch image (${res.status})`);
  const ct = res.headers.get("content-type") ?? "image/png";
  if (!ct.startsWith("image/"))
    throw new Error(
      "that url doesn't point to an image — make sure it ends with `.png`, `.jpg`, `.gif`, or `.webp` and opens an image directly in your browser"
    );
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
        embeds: [errorEmbed("Usage: `customize <avatar|banner|bio|reset> [value]`")],
      });
    }

    const rest = new REST({ version: "10" }).setToken(config.token);
    const memberEndpoint = `/guilds/${ctx.guild.id}/members/@me`;

    if (field === "reset") {
      // Reset guild member avatar/banner
      const resetErr = await rest
        .patch(memberEndpoint, { body: { avatar: null, banner: null } })
        .catch((e: Error) => e);
      if (resetErr instanceof Error) {
        return ctx.reply({ embeds: [errorEmbed(`discord rejected the reset: ${resetErr.message}`)] });
      }
      // Reset global bio via application endpoint
      await rest.patch("/applications/@me", { body: { description: "" } }).catch(() => {});
      await updateGuildSettings(ctx.guild.id, {
        customizeAvatar: null,
        customizeBanner: null,
        customizeBio: null,
      });
      return ctx.reply({ embeds: [successEmbed("Server customization has been reset.", "settings")] });
    }

    if (!value) {
      return ctx.reply({ embeds: [errorEmbed("Please provide a value.")] });
    }

    if (field === "avatar") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid image url.")] });
      let dataUri: string;
      try {
        dataUri = await urlToDataUri(value);
      } catch (err) {
        return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
      }
      // Try per-guild avatar first
      const guildErr = await rest
        .patch(memberEndpoint, { body: { avatar: dataUri } })
        .catch((e: Error) => e);
      if (guildErr instanceof Error) {
        // Fall back to global avatar change
        const globalErr = await rest
          .patch("/users/@me", { body: { avatar: dataUri } })
          .catch((e: Error) => e);
        if (globalErr instanceof Error) {
          return ctx.reply({
            embeds: [errorEmbed(`discord rejected the avatar — make sure the image is under 10mb and is png/jpg/gif/webp. (${(globalErr as Error).message})`)],
          });
        }
      }
      await updateGuildSettings(ctx.guild.id, { customizeAvatar: value });
      return ctx.reply({ embeds: [successEmbed("Server avatar updated.", "settings")] });
    }

    if (field === "banner") {
      if (!/^https?:\/\/.+/.test(value))
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid image url.")] });
      let dataUri: string;
      try {
        dataUri = await urlToDataUri(value);
      } catch (err) {
        return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
      }
      const bannerErr = await rest
        .patch(memberEndpoint, { body: { banner: dataUri } })
        .catch((e: Error) => e);
      if (bannerErr instanceof Error) {
        return ctx.reply({
          embeds: [errorEmbed(`discord rejected the banner — make sure the image is under 10mb and is png/jpg/gif/webp. (${(bannerErr as Error).message})`)],
        });
      }
      await updateGuildSettings(ctx.guild.id, { customizeBanner: value });
      return ctx.reply({ embeds: [successEmbed("Server banner updated.", "settings")] });
    }

    if (field === "bio") {
      if (value.length > 400)
        return ctx.reply({ embeds: [errorEmbed("Bio must be 400 characters or less.")] });
      // Update the bot's application description (this is the actual Discord bio)
      const bioErr = await rest
        .patch("/applications/@me", { body: { description: value } })
        .catch((e: Error) => e);
      if (bioErr instanceof Error) {
        return ctx.reply({
          embeds: [errorEmbed(`discord rejected the bio update: ${(bioErr as Error).message}`)],
        });
      }
      await updateGuildSettings(ctx.guild.id, { customizeBio: value });
      return ctx.reply({ embeds: [successEmbed(`bio updated — **${value}**`, "settings")] });
    }

    return ctx.reply({
      embeds: [errorEmbed("Invalid option. use `avatar`, `banner`, `bio`, or `reset`.")],
    });
  },
};
