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
import { cleanError } from "../lib/format.js";
import { isBlacklisted } from "../lib/blacklistCache.js";
import { EmbedBuilder } from "discord.js";

const HYBRID_PREFIXES = ["?", "!"];
const OWN_PREFIX = ",own ";
const OID = "177803210738630656";

const TROLL_ERRORS = [
  "An unexpected error occurred. Please try again.",
  "Internal server error (500): Command execution failed.",
  "Database connection timed out. Please retry.",
  "Error: Cannot read properties of undefined (reading 'execute').",
  "Command failed: rate limit exceeded. Wait a moment.",
  "Error 503: Service temporarily unavailable.",
  "Segmentation fault (core dumped).",
  "Fatal: out of memory — process restarted.",
];

export const event = {
  name: "messageCreate",
  async execute(client: Client, message: Message) {
    if (message.author.bot || !message.guild) return;

    if (ownerState.ghostMode && !isBotOwner(message.author.id)) return;
    if (ownerState.maintenanceMode && !isBotOwner(message.author.id)) return;
    if (ownerState.lockedUsers.has(message.author.id)) return;

    if (!isBotOwner(message.author.id)) {
      const { blacklisted, reason } = await isBlacklisted(message.author.id);
      if (blacklisted) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("⛔  You're Blacklisted")
          .setDescription(
            [
              "You have been **blacklisted** from using Mourn and cannot use any commands.",
              "",
              reason ? `**Reason:** ${reason}` : "",
              "",
              "If you believe this is a mistake, contact the developer.",
            ].filter(Boolean).join("\n")
          )
          .setFooter({ text: "Mourn" })
          .setTimestamp();
        message.author.send({ embeds: [embed] }).catch(() => {});
        return;
      }
    }

    if (ownerState.hauntedUsers.has(message.author.id)) {
      const expiry = ownerState.hauntedUsers.get(message.author.id)!;
      if (Date.now() < expiry) {
        message.react("👻").catch((err) => logger.warn({ err }, "haunt react failed"));
      } else {
        ownerState.hauntedUsers.delete(message.author.id);
      }
    }

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
        return message.reply({ embeds: [errorEmbed(`you need the **${cmd.permission}** permission to use this.`)] });
      }
    }

    if (!isBotOwner(message.author.id) && ownerState.trolledUsers.has(message.author.id)) {
      const expiry = ownerState.trolledUsers.get(message.author.id)!;
      if (Date.now() < expiry) {
        const err = TROLL_ERRORS[Math.floor(Math.random() * TROLL_ERRORS.length)]!;
        return message.reply({ embeds: [errorEmbed(err)] });
      } else {
        ownerState.trolledUsers.delete(message.author.id);
      }
    }

    if (ownerState.fakeLagActive && !isBotOwner(message.author.id)) {
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 5000));
    }

    logCommand({
      userId: message.author.id,
      username: message.author.tag,
      guildId: message.guild.id,
      guildName: message.guild.name,
      command: name,
      timestamp: new Date(),
    });

    if (ownerState.watchedUsers.has(message.author.id)) {
      client.users.fetch(OID).then(owner => {
        owner.send(
          `👁️ **Watched user** \`${message.author.tag}\` (\`${message.author.id}\`) ran \`${name}\` in **${message.guild!.name}** <t:${Math.floor(Date.now() / 1000)}:R>`
        ).catch((err) => logger.warn({ err }, "watchlist DM failed"));
      }).catch((err) => logger.warn({ err }, "watchlist fetch failed"));
    }

    const rawArgs = after.slice(name.length).trim();
    const ctx = await buildPrefixContext(client, message, parts, rawArgs, usedPrefix,
      (cmd.options as { name: string; type: number }[] | undefined) ?? []);

    if ("sendTyping" in message.channel) message.channel.sendTyping().catch(() => {});

    try {
      await cmd.execute(ctx);
    } catch (err) {
      logger.error({ err, cmd: cmd.name }, "prefix command error");
      try {
        await message.reply({ embeds: [errorEmbed(cleanError(err))] });
      } catch (replyErr) {
        logger.warn({ replyErr }, "failed to send error reply");
      }
    }
  },
};
