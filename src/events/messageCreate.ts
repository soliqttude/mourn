import { type Client, type Message } from "discord.js";
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
import { handleWordFilter } from "../features/wordfilter.js";
import { handleCounting } from "../features/counting.js";
import { handleHighlights } from "../features/highlights.js";
import { handleAutopublish } from "../features/autopublish.js";
import { ownerState, logCommand } from "../lib/ownerState.js";

const HYBRID_PREFIXES = ["?", "!"];
const OWN_PREFIX = ",own ";

export const event = {
  name: "messageCreate",
  async execute(client: Client, message: Message) {
    if (message.author.bot || !message.guild) return;

    if (ownerState.ghostMode && !isBotOwner(message.author.id)) return;
    if (ownerState.maintenanceMode && !isBotOwner(message.author.id)) return;
    if (ownerState.lockedUsers.has(message.author.id)) return;

    try {
      await handleAfk(client, message);
      await handleAutomod(client, message);
      await handleWordFilter(client, message);
      await handleAutoresponders(client, message);
      await handleLevelXp(client, message);
      await handleCounting(client, message);
      await handleHighlights(client, message);
      await handleAutopublish(client, message);
    } catch (err) {
      logger.error({ err }, "messageCreate feature handler error");
    }

    if (message.content.toLowerCase().startsWith(OWN_PREFIX) && !isBotOwner(message.author.id)) {
      return message.reply({ content: "this isn't yours to touch." });
    }

    const settings = await getGuildSettings(message.guild.id);
    const guildPrefix = settings.prefix || config.defaultPrefix;
    const mentionPrefix = `<@${client.user?.id}>`;
    const mentionPrefixNick = `<@!${client.user?.id}>`;

    let usedPrefix = "";
    const allPrefixes = [guildPrefix, ...HYBRID_PREFIXES, mentionPrefix, mentionPrefixNick];
    for (const p of allPrefixes) {
      if (message.content.startsWith(p)) { usedPrefix = p; break; }
    }
    if (!usedPrefix) return;

    const after = message.content.slice(usedPrefix.length).trimStart();
    if (!after) return;
    const parts = splitArgs(after);
    const name = parts.shift()!;
    const cmd = findCommand(name);
    if (!cmd) { await handleTags(client, message, name); return; }

    if (cmd.ownerOnly && !isBotOwner(message.author.id)) {
      return message.reply({ content: "this isn't yours to touch." });
    }
    if (cmd.permission && cmd.permission !== "everyone" && message.member) {
      if (!checkTier(message.member, cmd.permission)) {
        return message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
      }
    }

    logCommand({
      userId: message.author.id,
      username: message.author.tag,
      guildId: message.guild.id,
      guildName: message.guild.name,
      command: name,
      timestamp: new Date(),
    });

    const rawArgs = after.slice(name.length).trim();
    const ctx = await buildPrefixContext(client, message, parts, rawArgs, usedPrefix,
      (cmd.options as { name: string; type: number }[] | undefined) ?? []);
    try {
      await cmd.execute(ctx);
    } catch (err) {
      logger.error({ err, cmd: cmd.name }, "Prefix command error");
      try { await message.reply({ embeds: [errorEmbed((err as Error).message || "An unexpected error occurred.")] }); } catch { }
    }
  },
};
