import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "copyemoji",
  description: "(Owner) Copy an emoji from one server to another.",
  usage: "copyemoji [emoji] [from_guild] [to_guild]",
  examples: ["copyemoji"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "emoji", description: "Emoji name to copy", type: ApplicationCommandOptionType.String, required: true },
    { name: "from_guild", description: "Source guild ID (where the emoji is)", type: ApplicationCommandOptionType.String, required: true },
    { name: "to_guild", description: "Target guild ID (where to add it)", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const emojiName = ctx.getString("emoji", true)!;
    const fromId = ctx.getString("from_guild", true)!;
    const toId = ctx.getString("to_guild", true)!;

    const fromGuild = ctx.client.guilds.cache.get(fromId);
    const toGuild = ctx.client.guilds.cache.get(toId);
    if (!fromGuild) return ctx.reply({ embeds: [errorEmbed(`bot is not in source guild \`${fromId}\`.`)] });
    if (!toGuild) return ctx.reply({ embeds: [errorEmbed(`bot is not in target guild \`${toId}\`.`)] });

    await fromGuild.emojis.fetch().catch(() => {});
    const emoji = fromGuild.emojis.cache.find(e => e.name?.toLowerCase() === emojiName.toLowerCase());
    if (!emoji) return ctx.reply({ embeds: [errorEmbed(`no emoji named \`${emojiName}\` found in **${fromGuild.name}**.`)] });

    try {
      const created = await toGuild.emojis.create({ attachment: emoji.url, name: emoji.name ?? emojiName });
      return ctx.reply({ embeds: [successEmbed(`emoji ${created.toString()} \`${created.name}\` copied to **${toGuild.name}**.`)] });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`failed: ${e?.message ?? "unknown error"}`)] });
    }
  },
};
