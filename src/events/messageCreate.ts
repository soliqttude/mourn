import {
  type Client,
  type Message,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { findCommand } from "../handlers/registry.js";
import { buildPrefixContext } from "../lib/contextFactory.js";
import { errorEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";
import { checkTier, isBotOwner } from "../lib/permissions.js";
import { splitArgs } from "../lib/parsing.js";
import { handleAfk } from "../features/afk.js";
import { handleAutoresponders } from "../features/autoresponders.js";
import { handleTags } from "../features/tags.js";
import { handleLevelXp } from "../features/leveling.js";
import { handleAutomod } from "../features/automod.js";

export const event = {
  name: "messageCreate",
  async execute(client: Client, message: Message) {
    if (message.author.bot || !message.guild) return;

    try {
      await handleAfk(client, message);
      await handleAutomod(client, message);
      await handleAutoresponders(client, message);
      await handleLevelXp(client, message);
    } catch (err) {
      logger.error({ err }, "messageCreate feature handler error");
    }

    const settings = await getGuildSettings(message.guild.id);
    const prefix = settings.prefix || config.defaultPrefix;
    const mentionPrefix = `<@${client.user?.id}>`;
    const mentionPrefixNick = `<@!${client.user?.id}>`;

    let usedPrefix = "";
    if (message.content.startsWith(prefix)) usedPrefix = prefix;
    else if (message.content.startsWith(mentionPrefix)) usedPrefix = mentionPrefix;
    else if (message.content.startsWith(mentionPrefixNick))
      usedPrefix = mentionPrefixNick;

    if (!usedPrefix) return;

    const after = message.content.slice(usedPrefix.length).trimStart();
    if (!after) return;
    const parts = splitArgs(after);
    const name = parts.shift()!;
    const cmd = findCommand(name);
    if (!cmd) {
      const tag = await handleTags(client, message, name);
      if (tag) return;
      return;
    }

    if (cmd.ownerOnly && !isBotOwner(message.author.id)) return;
    if (cmd.permission && cmd.permission !== "everyone" && message.member) {
      if (!checkTier(message.member, cmd.permission)) {
        return message.reply({
          embeds: [errorEmbed("You don't have permission to use this command.")],
        });
      }
    }

    const rawArgs = after.slice(name.length).trim();
    const ctx = await buildPrefixContext(
      client,
      message,
      parts,
      rawArgs,
      prefix,
      (cmd.options as { name: string; type: number }[] | undefined) ?? []
    );

    try {
      await cmd.execute(ctx);
    } catch (err) {
      logger.error({ err, cmd: cmd.name }, "Prefix command error");
      try {
        await message.reply({
          embeds: [
            errorEmbed((err as Error).message || "An unexpected error occurred."),
          ],
        });
      } catch {
        /* ignore */
      }
    }
  },
};
