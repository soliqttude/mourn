import { type Client, type Message } from "discord.js";
import { findCommand } from "../handlers/registry.js";
import { buildPrefixContext } from "../lib/contextFactory.js";
import { errorEmbed, helpEmbed } from "../lib/embeds.js";
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
import { commandAliases, disabledCommands, disabledModules, eventsSettings } from "../db/schema.js";
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

// Per-guild alias cache
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

// ── Disable check helpers ─────────────────────────────────────────────────────

/** Returns true if the event is disabled for this guild */
async function isEventDisabled(guildId: string, eventName: string): Promise<boolean> {
  const rows = await db.select().from(eventsSettings)
    .where(and(eq(eventsSettings.guildId, guildId), eq(eventsSettings.event, eventName)));
  return rows.length > 0 && !rows[0]!.enabled;
}

/** Returns true if the command is disabled for this channel or for any of the member's roles */
async function isCommandDisabled(guildId: string, channelId: string, memberId: string, roleIds: string[], cmdName: string): Promise<boolean> {
  const rows = await db.select().from(disabledCommands)
    .where(and(eq(disabledCommands.guildId, guildId), eq(disabledCommands.command, cmdName)));
  for (const row of rows) {
    if (row.targetType === "channel" && row.targetId === channelId) return true;
    if (row.targetType === "role" && roleIds.includes(row.targetId)) return true;
  }
  return false;
}

/** Returns true if any of the given modules are disabled for this channel */
async function isModuleDisabled(guildId: string, channelId: string, moduleName: string): Promise<boolean> {
  const rows = await db.select().from(disabledModules)
    .where(and(eq(disabledModules.guildId, guildId), eq(disabledModules.channelId, channelId), eq(disabledModules.module, moduleName)));
  return rows.length > 0;
}

const ANTINUKE_CMD_MAP: Record<string, string> = {
  ban: "ban", softban: "ban", tempban: "ban", hackban: "ban", forceban: "ban",
  kick: "kick",
  delrole: "role",
};

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
          embeds: [errorEmbed(reason ? `you are blacklisted from mourn.\n**reason** — ${reason}` : "you are blacklisted from mourn.")],
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

    // ── Check if the messageCreate event itself is disabled for this guild ────
    if (!isBotOwner(message.author.id)) {
      const evtDisabled = await isEventDisabled(message.guild.id, "messageCreate").catch(() => false);
      if (evtDisabled) return;
    }

    const channelId = message.channelId;
    const guildId = message.guild.id;
    const memberRoleIds = message.member?.roles.cache.map(r => r.id) ?? [];

    // ── Feature handlers — each guarded by module disable check ───────────────
    try {
      // afk is always active (no module gating)
      await handleAfk(client, message);

      const automodDisabled = isBotOwner(message.author.id) ? false :
        await isModuleDisabled(guildId, channelId, "automod").catch(() => false);
      if (!automodDisabled) {
        await handleAutomod(client, message);
        await handleWordFilter(client, message);
      }

      const levelsDisabled = isBotOwner(message.author.id) ? false :
        await isModuleDisabled(guildId, channelId, "levels").catch(() => false);
      if (!levelsDisabled) await handleLevelXp(client, message);

      const countingDisabled = isBotOwner(message.author.id) ? false :
        await isModuleDisabled(guildId, channelId, "counting").catch(() => false);
      if (!countingDisabled) await handleCounting(client, message);

      await handleHighlights(client, message);
      await handleAutopublish(client, message);
      await handleReactionTriggers(client, message);
    } catch (err) {
      logger.error({ err }, "messageCreate feature handler error");
    }

    if (message.content.toLowerCase().startsWith(OWN_PREFIX) && !isBotOwner(message.author.id)) {
      return message.reply({ content: "this isn't yours to touch." });
    }

    const settings = await getGuildSettings(guildId);
    const guildPrefix = settings.prefix || config.defaultPrefix;
    const mentionPrefix = `<@${client.user?.id}>`;
    const mentionPrefixNick = `<@!${client.user?.id}>`;

    let usedPrefix = "";
    const allPrefixes = [guildPrefix, ...HYBRID_PREFIXES, mentionPrefix, mentionPrefixNick];
    for (const p of allPrefixes) {
      if (message.content.startsWith(p)) { usedPrefix = p; break; }
    }

    if (!usedPrefix) {
      // ── Owner greeting ──────────────────────────────────────────────────────
      if (message.author.id === "1492017858182385684" && message.content.toLowerCase().includes("mourn")) {
        await message.reply({ content: "Hello Sir." }).catch(() => {});
        return;
      }

      const arDisabled = isBotOwner(message.author.id) ? false :
        await isModuleDisabled(guildId, channelId, "autoresponders").catch(() => false);
      if (!arDisabled) {
        try { await handleAutoresponders(client, message); } catch (err) {
          logger.error({ err }, "autoresponder error");
        }
      }
      return;
    }

    const after = message.content.slice(usedPrefix.length).trimStart();
    if (!after) return;
    const parts = splitArgs(after);
    const rawName = parts.shift()!;

    // ── Resolve command: built-in → guild alias fallback ──────────────────────
    let cmd = findCommand(rawName);
    let resolvedName = rawName;

    if (!cmd) {
      const aliased = await resolveAlias(guildId, rawName.toLowerCase()).catch(() => null);
      if (aliased) {
        resolvedName = aliased;
        cmd = findCommand(aliased);
      }
    }

    if (!cmd) {
      const tagsDisabled = isBotOwner(message.author.id) ? false :
        await isModuleDisabled(guildId, channelId, "tags").catch(() => false);
      if (!tagsDisabled) await handleTags(client, message, rawName);
      return;
    }

    if (cmd.ownerOnly && !isBotOwner(message.author.id)) {
      return message.reply({ content: "this isn't yours to touch." });
    }
    if (cmd.permission && cmd.permission !== "everyone") {
      // Always resolve a fresh member so null/partial never skips the check
      const member = (!message.member || message.member.partial)
        ? await message.guild!.members.fetch(message.author.id).catch(() => null)
        : message.member;
      if (!member || !checkTier(member, cmd.permission)) {
        const permEmbed = errorEmbed(`<:warn:1508824473992696049> ${message.author}: You're **missing** permission: \`${cmd.permission}\``);
        await message.reply({ embeds: [permEmbed] }).catch(() =>
          message.channel.send({ embeds: [permEmbed] }).catch(() => {})
        );
        return;
      }
    }

    // ── Disabled command check ─────────────────────────────────────────────────
    if (!isBotOwner(message.author.id)) {
      const cmdDisabled = await isCommandDisabled(guildId, channelId, message.author.id, memberRoleIds, resolvedName).catch(() => false);
      if (cmdDisabled) {
        await message.reply({ embeds: [errorEmbed(`\`${resolvedName}\` is disabled in this channel.`)] }).catch(() => {});
        return;
      }

      // Check if entire module is disabled for this channel
      if (cmd.category) {
        const modDisabled = await isModuleDisabled(guildId, channelId, cmd.category).catch(() => false);
        if (modDisabled) {
          await message.reply({ embeds: [errorEmbed(`the \`${cmd.category}\` module is disabled in this channel.`)] }).catch(() => {});
          return;
        }
      }
    }

    // ── Show help embed when required args are missing (perm check already passed) ─
    const hasRequiredOptions = (cmd.options ?? []).some((o: any) => o.required === true);
    if (hasRequiredOptions && parts.length === 0) {
      return message.reply({ embeds: [helpEmbed(cmd, usedPrefix, client.user?.displayAvatarURL())] });
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
      guildId,
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
      // antinuke: command detection (--command flag)
      const anModule = ANTINUKE_CMD_MAP[resolvedName.toLowerCase()];
      if (anModule && message.guild) {
        import("../features/antinuke.js").then(({ tickCommandUsage }) =>
          tickCommandUsage(client, message.guild!, message.author.id, anModule).catch(() => {})
        ).catch(() => {});
      }
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
