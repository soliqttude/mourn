import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { suggestions, suggestExtended } from "../../db/schema.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { eq, and } from "drizzle-orm";

async function getExtended(guildId: string) {
  const [row] = await db.select().from(suggestExtended).where(eq(suggestExtended.guildId, guildId));
  return row ?? { guildId, threadsEnabled: false, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: null, reviewEnabled: false, ignoreIds: [] as string[] };
}

const STATUS_COLORS: Record<string, number> = {
  pending: 0x5865f2,
  approved: 0x57f287,
  denied: 0xed4245,
  considering: 0xfee75c,
  "in progress": 0xfb923c,
};

export const command: HybridCommand = {
  name: "suggest",
  description: "Submit a suggestion or manage the suggestion system.",
  usage: "suggest [suggestion] | suggest <set|config|approve|deny|consider|progress|reply|review|threads|reactions|ignore|reset>",
  examples: [
    "suggest add a dark mode",
    "suggest approve 5 great idea!",
    "suggest deny 3 already exists",
    "suggest consider 7",
    "suggest progress 2",
    "suggest reply 4 we will look into this",
    "suggest threads on",
    "suggest reactions 🔥 💀",
    "suggest review #staff-suggestions",
    "suggest ignore @user",
  ],
  category: "settings",
  guildOnly: true,
  options: [
    { name: "action", description: "suggestion text, or subcommand", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "ID, message, emoji, or on/off", type: ApplicationCommandOptionType.String, required: false },
    { name: "value2", description: "Second value (for reactions, reply note)", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Suggestions channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const val = ctx.getString("value") ?? ctx.args[1] ?? "";
    const val2 = ctx.getString("value2") ?? ctx.args[2] ?? "";

    const STAFF_ACTIONS = ["approve", "deny", "consider", "progress", "reply", "reset"];
    const ADMIN_ACTIONS = ["set", "config", "threads", "reactions", "ignore", "review"];

    const isStaffAction = STAFF_ACTIONS.includes(action);
    const isAdminAction = ADMIN_ACTIONS.includes(action);

    if (isStaffAction || isAdminAction) {
      const member = ctx.member as any;
      const isAdmin = member?.permissions?.has("ManageGuild");
      if (isStaffAction && !isAdmin) {
        const settings = await getGuildSettings(ctx.guild.id);
        const staffRoles: string[] = (settings as any).staffRoleIds ?? [];
        const isStaff = staffRoles.length === 0 || staffRoles.some((r: string) => member?.roles?.cache?.has(r));
        if (!isStaff) return ctx.reply({ embeds: [errorEmbed("You need staff **permissions** to use this.")] });
      } else if (isAdminAction && !isAdmin) {
        return ctx.reply({ embeds: [errorEmbed("You need **Manage Guild** to configure suggestions.")] });
      }
    }

    // ── Staff subcommands ──────────────────────────────────────────────────────
    if (isStaffAction) {
      const id = parseInt(val);
      if (isNaN(id)) return ctx.reply({ embeds: [errorEmbed("Provide a suggestion ID.")] });
      const [sug] = await db.select().from(suggestions).where(and(eq(suggestions.guildId, ctx.guild.id), eq(suggestions.id, id)));
      if (!sug) return ctx.reply({ embeds: [errorEmbed(`suggestion #${id} not found.`)] });

      if (action === "reply") {
        const replyText = ctx.args.slice(2).join(" ") || val2;
        if (!replyText) return ctx.reply({ embeds: [errorEmbed("Provide a reply message.")] });
        const ch = ctx.guild.channels.cache.get(sug.channelId) as any;
        if (ch?.isTextBased()) {
          const msg = await ch.messages?.fetch(sug.messageId).catch(() => null);
          await ch.send({
            embeds: [new EmbedBuilder()
              .setColor(0x5865f2)
              .setAuthor({ name: `staff reply — suggestion #${id}` })
              .setDescription(replyText)
              .setFooter({ text: `replied by ${ctx.user.username}` })
              .setTimestamp()],
            ...(msg ? { reply: { messageReference: msg } } : {}),
          }).catch(() => {});
        }
        await db.update(suggestions).set({ staffNote: replyText }).where(eq(suggestions.id, id));
        return ctx.reply({ embeds: [successEmbed("Staff reply sent.")] });
      }

      const statusMap: Record<string, string> = {
        approve: "approved",
        deny: "denied",
        consider: "considering",
        progress: "in progress",
        reset: "pending",
      };
      const newStatus = statusMap[action] ?? "pending";
      const staffNote = ctx.args.slice(2).join(" ") || val2 || null;
      await db.update(suggestions).set({ status: newStatus, staffNote: staffNote ?? sug.staffNote }).where(eq(suggestions.id, id));

      // Update the suggestion message embed if possible
      const ch = ctx.guild.channels.cache.get(sug.channelId) as any;
      if (ch?.isTextBased()) {
        const msg = await ch.messages?.fetch(sug.messageId).catch(() => null);
        if (msg) {
          const color = STATUS_COLORS[newStatus] ?? 0x5865f2;
          const statusEmbed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: `💡 suggestion · ${newStatus}` })
            .setDescription(sug.content)
            .addFields(
              { name: "submitted by", value: `<@${sug.userId}>`, inline: true },
              { name: "status", value: newStatus, inline: true },
            );
          if (staffNote) statusEmbed.addFields({ name: "staff note", value: staffNote, inline: false });
          statusEmbed.setTimestamp();
          await msg.edit({ embeds: [statusEmbed] }).catch(() => {});
        }
      }

      // Post to review channel if configured
      const ext = await getExtended(ctx.guild.id);
      if (ext.reviewEnabled && ext.reviewChannel) {
        const reviewCh = ctx.guild.channels.cache.get(ext.reviewChannel) as any;
        if (reviewCh?.isTextBased()) {
          const color = STATUS_COLORS[newStatus] ?? 0x5865f2;
          const reviewEmbed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: `suggestion #${id} — ${newStatus}` })
            .setDescription(sug.content)
            .addFields(
              { name: "submitted by", value: `<@${sug.userId}>`, inline: true },
              { name: "actioned by", value: `<@${ctx.user.id}>`, inline: true },
              { name: "status", value: newStatus, inline: true },
            );
          if (staffNote) reviewEmbed.addFields({ name: "note", value: staffNote, inline: false });
          await reviewCh.send({ embeds: [reviewEmbed] }).catch(() => {});
        }
      }

      return ctx.reply({ embeds: [successEmbed(`suggestion #${id} marked as **${newStatus}**.`)] });
    }

    // ── Admin config subcommands ───────────────────────────────────────────────
    if (action === "set") {
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(val.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Provide a **channel**.")] });
      await updateGuildSettings(ctx.guild.id, { suggestionsChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`suggestions channel set to <#${ch.id}>.`)] });
    }

    if (action === "config") {
      const settings = await getGuildSettings(ctx.guild.id);
      const ext = await getExtended(ctx.guild.id);
      return ctx.reply({ embeds: [brandEmbed({
        title: "suggestions config",
        fields: [
          { name: "channel",        value: settings.suggestionsChannel ? `<#${settings.suggestionsChannel}>` : "not set", inline: true },
          { name: "threads",        value: ext.threadsEnabled ? "on" : "off", inline: true },
          { name: "upvote emoji",   value: ext.upvoteEmoji, inline: true },
          { name: "downvote emoji", value: ext.downvoteEmoji, inline: true },
          { name: "review channel", value: ext.reviewChannel ? `<#${ext.reviewChannel}>` : "off", inline: true },
          { name: "review log",     value: ext.reviewEnabled ? "on" : "off", inline: true },
        ],
      })] });
    }

    if (action === "threads") {
      const on = val === "on";
      await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: on, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: null, reviewEnabled: false, ignoreIds: [] })
        .onConflictDoUpdate({ target: suggestExtended.guildId, set: { threadsEnabled: on } });
      return ctx.reply({ embeds: [successEmbed(`suggestion threads **${on ? "enabled" : "disabled"}**.`)] });
    }

    if (action === "reactions") {
      if (!val || !val2) return ctx.reply({ embeds: [errorEmbed("Provide two **emojis**: upvote then downvote.")] });
      await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: false, upvoteEmoji: val, downvoteEmoji: val2, reviewChannel: null, reviewEnabled: false, ignoreIds: [] })
        .onConflictDoUpdate({ target: suggestExtended.guildId, set: { upvoteEmoji: val, downvoteEmoji: val2 } });
      return ctx.reply({ embeds: [successEmbed(`suggestion reactions set to ${val} / ${val2}.`)] });
    }

    if (action === "review") {
      if (val.toLowerCase() === "off" || !val) {
        await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: false, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: null, reviewEnabled: false, ignoreIds: [] })
          .onConflictDoUpdate({ target: suggestExtended.guildId, set: { reviewChannel: null, reviewEnabled: false } });
        return ctx.reply({ embeds: [successEmbed("Suggestion review **channel** disabled.")] });
      }
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(val.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Provide a **channel** or `off`.")] });
      await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: false, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: ch.id, reviewEnabled: true, ignoreIds: [] })
        .onConflictDoUpdate({ target: suggestExtended.guildId, set: { reviewChannel: ch.id, reviewEnabled: true } });
      return ctx.reply({ embeds: [successEmbed(`staff actions on suggestions will be logged to <#${ch.id}>.`)] });
    }

    if (action === "ignore") {
      const targetId = val.replace(/[<@!&>]/g, "");
      if (!targetId) return ctx.reply({ embeds: [errorEmbed("Mention a **member** or **role** to ignore.")] });
      const ext = await getExtended(ctx.guild.id);
      const current = ext.ignoreIds as string[];
      const updated = current.includes(targetId) ? current.filter(i => i !== targetId) : [...current, targetId];
      await db.insert(suggestExtended).values({ guildId: ctx.guild.id, threadsEnabled: false, upvoteEmoji: "👍", downvoteEmoji: "👎", reviewChannel: null, reviewEnabled: false, ignoreIds: updated })
        .onConflictDoUpdate({ target: suggestExtended.guildId, set: { ignoreIds: updated } });
      const removed = !updated.includes(targetId);
      return ctx.reply({ embeds: [successEmbed(`<@${targetId}> ${removed ? "removed from" : "added to"} suggestions ignore list.`)] });
    }

    // ── Submit a suggestion ────────────────────────────────────────────────────
    const text = ctx.rawArgs || ctx.getString("action") || "";
    if (!text || text.length < 5) return ctx.reply({ embeds: [errorEmbed("Please provide a longer suggestion (at least 5 characters).")] });
    const settings = await getGuildSettings(ctx.guild.id);
    const channelId = settings.suggestionsChannel;
    if (!channelId) return ctx.reply({ embeds: [errorEmbed("No suggestions **channel** set. ask an admin.")] });
    const ch = ctx.guild.channels.cache.get(channelId) as any;
    if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Suggestions **channel** is invalid.")] });

    const ext = await getExtended(ctx.guild.id);
    const ignoreIds: string[] = (ext.ignoreIds as string[]) ?? [];
    if (ignoreIds.includes(ctx.user.id)) return ctx.reply({ embeds: [errorEmbed("You are not allowed to submit suggestions.")] });

    const up = ext.upvoteEmoji ?? "👍";
    const down = ext.downvoteEmoji ?? "👎";
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("suggest_up").setLabel(`${up} 0`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggest_down").setLabel(`${down} 0`).setStyle(ButtonStyle.Danger),
    );
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: "💡 new suggestion" })
      .setDescription(text)
      .addFields({ name: "submitted by", value: `<@${ctx.user.id}>`, inline: true }, { name: "status", value: "pending", inline: true })
      .setTimestamp();
    const msg = await ch.send({ embeds: [embed], components: [row] });
    const [inserted] = await db.insert(suggestions)
      .values({ guildId: ctx.guild.id, userId: ctx.user.id, messageId: msg.id, channelId: ch.id, content: text })
      .returning();
    if (ext.threadsEnabled) {
      try { await msg.startThread({ name: `suggestion — ${text.slice(0, 80)}` }); } catch { }
    }
    return ctx.reply({ embeds: [successEmbed("Your suggestion has been submitted!")], ephemeral: true } as any);
  },
};
