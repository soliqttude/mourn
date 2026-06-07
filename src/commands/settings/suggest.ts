import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { suggestions, suggestExtended } from "../../db/schema.js";
import { getGuildSettings } from "../../db/settings.js";
import { eq, and } from "drizzle-orm";

async function getExtended(guildId: string) {
  const [row] = await db.select().from(suggestExtended).where(eq(suggestExtended.guildId, guildId));
  return row ?? { guildId, threadsEnabled: false, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: null, reviewEnabled: false, ignoreIds: [] as string[] };
}

export const command: HybridCommand = {
  name: "suggest",
  description: "Submit a suggestion or manage the suggestion system.",
  usage: "suggest [suggestion] | suggest <set|config|approve|deny|consider|progress|reply|threads|reactions|ignore|lock|unlock|reset>",
  examples: ["suggest add a dark mode", "suggest approve 5", "suggest threads on", "suggest reactions 🔥 💀"],
  category: "settings",
  guildOnly: true,
  options: [
    { name: "action", description: "suggestion text, or subcommand", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "ID, message, emoji, or on/off", type: ApplicationCommandOptionType.String, required: false },
    { name: "value2", description: "Second value (for reactions)", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Suggestions channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const val = ctx.getString("value") ?? ctx.args[1] ?? "";
    const val2 = ctx.getString("value2") ?? ctx.args[2] ?? "";

    const STAFF_ACTIONS = ["approve", "deny", "consider", "progress", "reply", "reset"];
    const isStaffAction = STAFF_ACTIONS.includes(action);
    if (isStaffAction) {
      const member = ctx.member as any;
      const settings = await getGuildSettings(ctx.guild.id);
      const staffRoles: string[] = (settings as any).staffRoleIds ?? [];
      const isStaff = staffRoles.length === 0 || staffRoles.some(r => member?.roles?.cache?.has(r));
      if (!isStaff && !member?.permissions?.has("ManageGuild")) {
        return ctx.reply({ embeds: [errorEmbed("you need staff permissions to use this.")] });
      }
    }

    // ── Staff subcommands ──────────────────────────────────────────────────────
    if (isStaffAction) {
      const id = parseInt(val);
      if (isNaN(id)) return ctx.reply({ embeds: [errorEmbed("please provide a suggestion ID.")] });
      const [sug] = await db.select().from(suggestions).where(and(eq(suggestions.guildId, ctx.guild.id), eq(suggestions.id, id)));
      if (!sug) return ctx.reply({ embeds: [errorEmbed(`suggestion #${id} not found.`)] });

      const statusMap: Record<string, string> = { approve: "approved", deny: "denied", consider: "considering", progress: "in progress", reset: "pending" };
      if (action === "reply") {
        const replyText = ctx.args.slice(2).join(" ") || val2;
        if (!replyText) return ctx.reply({ embeds: [errorEmbed("please provide a reply.")] });
        const ch = ctx.guild.channels.cache.get(sug.channelId) as any;
        const msg = await ch?.messages?.fetch(sug.messageId).catch(() => null);
        if (msg) await ch.send({ reply: { messageReference: msg }, content: `**Staff Reply:** ${replyText}` });
        return ctx.reply({ embeds: [successEmbed("reply sent.")] });
      }

      const newStatus = statusMap[action] ?? "pending";
      await db.update(suggestions).set({ status: newStatus }).where(eq(suggestions.id, id));
      return ctx.reply({ embeds: [successEmbed(`suggestion #${id} marked as **${newStatus}**.`)] });
    }

    // ── Admin config subcommands ───────────────────────────────────────────────
    const adminActions = ["set", "config", "threads", "reactions", "ignore", "lock", "unlock"];
    if (adminActions.includes(action)) {
      const member = ctx.member as any;
      if (!member?.permissions?.has("ManageGuild")) {
        return ctx.reply({ embeds: [errorEmbed("you need Manage Guild permission.")] });
      }

      if (action === "set") {
        const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(val.replace(/[<#>]/g, ""));
        if (!ch) return ctx.reply({ embeds: [errorEmbed("please provide a channel.")] });
        const { updateGuildSettings } = await import("../../db/settings.js");
        await updateGuildSettings(ctx.guild.id, { suggestionsChannel: ch.id });
        return ctx.reply({ embeds: [successEmbed(`suggestions channel set to <#${ch.id}>.`)] });
      }

      if (action === "config") {
        const settings = await getGuildSettings(ctx.guild.id);
        const ext = await getExtended(ctx.guild.id);
        return ctx.reply({ embeds: [brandEmbed({
          title: "Suggestions Config",
          fields: [
            { name: "channel", value: settings.suggestionsChannel ? `<#${settings.suggestionsChannel}>` : "not set", inline: true },
            { name: "threads", value: ext.threadsEnabled ? "on" : "off", inline: true },
            { name: "upvote", value: ext.upvoteEmoji, inline: true },
            { name: "downvote", value: ext.downvoteEmoji, inline: true },
            { name: "review channel", value: ext.reviewChannel ? `<#${ext.reviewChannel}>` : "off", inline: true },
          ],
        })] });
      }

      if (action === "threads") {
        const on = val === "on";
        await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: on, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: null, reviewEnabled: false, ignoreIds: [] })
          .onConflictDoUpdate({ target: suggestExtended.guildId, set: { threadsEnabled: on } });
        return ctx.reply({ embeds: [successEmbed(`auto-threads on suggestions ${on ? "enabled" : "disabled"}.`)] });
      }

      if (action === "reactions") {
        if (!val || !val2) return ctx.reply({ embeds: [errorEmbed("provide two emojis: upvote then downvote.")] });
        await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: false, upvoteEmoji: val, downvoteEmoji: val2, reviewChannel: null, reviewEnabled: false, ignoreIds: [] })
          .onConflictDoUpdate({ target: suggestExtended.guildId, set: { upvoteEmoji: val, downvoteEmoji: val2 } });
        return ctx.reply({ embeds: [successEmbed(`suggestion reactions set to ${val} / ${val2}.`)] });
      }

      if (action === "ignore") {
        const targetId = val.replace(/[<@!&>]/g, "");
        if (!targetId) return ctx.reply({ embeds: [errorEmbed("please mention a member or role to ignore.")] });
        const ext = await getExtended(ctx.guild.id);
        const current = ext.ignoreIds as string[];
        const updated = current.includes(targetId) ? current.filter(i => i !== targetId) : [...current, targetId];
        await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: false, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: null, reviewEnabled: false, ignoreIds: updated })
          .onConflictDoUpdate({ target: suggestExtended.guildId, set: { ignoreIds: updated } });
        return ctx.reply({ embeds: [successEmbed(`<@${targetId}> ${updated.includes(targetId) ? "added to" : "removed from"} suggestions ignore list.`)] });
      }
    }

    // ── Submit a suggestion ────────────────────────────────────────────────────
    const text = ctx.rawArgs ?? ctx.getString("action");
    if (!text) return ctx.reply({ embeds: [errorEmbed("please provide a suggestion.")] });
    const settings = await getGuildSettings(ctx.guild.id);
    const channelId = settings.suggestionsChannel;
    if (!channelId) return ctx.reply({ embeds: [errorEmbed("no suggestions channel set. ask an admin.")] });
    const ch = ctx.guild.channels.cache.get(channelId) as any;
    if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("suggestions channel is invalid.")] });

    const ext = await getExtended(ctx.guild.id);
    const ignoreIds: string[] = (ext.ignoreIds as string[]) ?? [];
    if (ignoreIds.includes(ctx.user.id)) return ctx.reply({ embeds: [errorEmbed("you are not allowed to submit suggestions.")] });

    const up = ext.upvoteEmoji ?? "👍";
    const down = ext.downvoteEmoji ?? "👎";
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("suggest_up").setLabel(`${up} 0`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggest_down").setLabel(`${down} 0`).setStyle(ButtonStyle.Danger),
    );
    const msg = await ch.send({
      embeds: [brandEmbed({ title: "💡 New Suggestion", description: text, user: ctx.user, page: "Suggestions" })],
      components: [row],
    });
    await db.insert(suggestions).values({ guildId: ctx.guild.id, userId: ctx.user.id, messageId: msg.id, channelId: ch.id, content: text });
    if (ext.threadsEnabled) { try { await msg.startThread({ name: `Suggestion — ${text.slice(0, 80)}` }); } catch { /* ignore */ } }
    return ctx.reply({ embeds: [successEmbed("your suggestion has been submitted!")], ephemeral: true } as any);
  },
};
