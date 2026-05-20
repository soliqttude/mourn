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
import { handleReactionTriggers } from "../features/reactionTriggers.js";
import { ownerState, logCommand } from "../lib/ownerState.js";
import { cleanError } from "../lib/format.js";
import { isBlacklisted } from "../lib/blacklistCache.js";
import { db } from "../db/index.js";
import { commandAliases } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

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

// Per-guild alias cache (cleared when aliases are modified)
const aliasCache = new Map<string, Map<string, string>>();

async function resolveAlias(guildId: string, name: string): Promise<string | null> {
  if (!aliasCache.has(guildId)) {
    const rows = await db.select().from(commandAliases).where(eq(commandAliases.guildId, guildId));
    const map = new Map<string, string>(rows.map((r) => [r.alias, r.command] as [string, string]));
    aliasCache.set(guildId, map);
  }
  return aliasCache.get(guildId)?.get(name) ?? null;
}

export function invalidateAliasCache(guildId: string) {
  aliasCache.delete(guildId);
}

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
        message.author.send({
          embeds: [errorEmbed(reason ? `you are blacklisted from bleed.\n**reason** — ${reason}` : "you are blacklisted from bleed.")],
        }).catch(() => {});
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
      await handleLevelXp(client, message);
      await handleCounting(client, message);
      await handleHighlights(client, message);
      await handleAutopublish(client, message);
      await handleReactionTriggers(client, message);
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

    if (!usedPrefix) {
      try { await handleAutoresponders(client, message); } catch (err) {
        logger.error({ err }, "autoresponder error");
      }
      return;
    }

    const after = message.content.slice(usedPrefix.length).trimStart();
    if (!after) return;
    const parts = splitArgs(after);
    const rawName = parts.shift()!;

    // ── Resolve command: built-in → guild alias fallback ─────────────────────
    let cmd = findCommand(rawName);
    let resolvedName = rawName;

    if (!cmd) {
      const aliased = await resolveAlias(message.guild.id, rawName.toLowerCase()).catch(() => null);
      if (aliased) {
        resolvedName = aliased;
        cmd = findCommand(aliased);
      }
    }

    if (!cmd) { await handleTags(client, message, rawName); return; }

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
      command: resolvedName,
      timestamp: new Date(),
    });

    if (ownerState.watchedUsers.has(message.author.id)) {
      client.users.fetch(OID).then(owner => {
        owner.send(
          `👁️ **Watched user** \`${message.author.tag}\` (\`${message.author.id}\`) ran \`${resolvedName}\` in **${message.guild!.name}** <t:${Math.floor(Date.now() / 1000)}:R>`
        ).catch((err) => logger.warn({ err }, "watchlist DM failed"));
      }).catch((err) => logger.warn({ err }, "watchlist fetch failed"));
    }

    const rawArgs = after.slice(rawName.length).trim();
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
