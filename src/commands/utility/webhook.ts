import { ApplicationCommandOptionType, WebhookClient } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { managedWebhooks } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { resolveChannel } from "../../lib/parsing.js";
import { parseScript } from "../../lib/scripting.js";

export const command: HybridCommand = {
  name: "webhook",
  aliases: ["wh"],
  description: "Manage server webhooks. Subcommands: create, send, edit, delete, list, info, lock, unlock",
  category: "utility",
  permission: "manage_webhooks",
  guildOnly: true,
  usage: "webhook [create|send|edit|delete|list|info|lock|unlock] [args]",
  examples: [
    "webhook create alerts #general",
    "webhook send alerts Hello world!",
    "webhook edit https://discord.com/channels/GUILD/CHANNEL/MESSAGE Updated message",
    "webhook delete alerts",
    "webhook list",
  ],
  options: [
    { name: "subcommand", description: "create | send | edit | delete | list | info", type: ApplicationCommandOptionType.String, required: true },
    { name: "name", description: "Webhook identifier", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Target channel (for create)", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Message to send (for send)", type: ApplicationCommandOptionType.String, required: false },
    { name: "username", description: "Override username (for send)", type: ApplicationCommandOptionType.String, required: false },
    { name: "avatar", description: "Override avatar URL (for send)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const name = ctx.getString("name") ?? ctx.args[1];
    const guildId = ctx.guild.id;

    if (sub === "list") {
      const rows = await db.select().from(managedWebhooks).where(eq(managedWebhooks.guildId, guildId));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No **webhooks** configured.")] });
      const lines = rows.map(r => `**${r.identifier}** → <#${r.channelId}> · ${r.locked ? "locked" : "active"}`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Server Webhooks", description: lines.join("\n") })] });
    }

    if (sub === "create") {
      if (!name) return ctx.reply({ embeds: [errorEmbed("Provide a name for the **webhook**.")] });
      const ch = ctx.getChannel("channel") ?? (ctx.args[2] ? resolveChannel(ctx.guild, ctx.args[2]) : ctx.channel);
      if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Provide a valid text **channel**.")] });
      const existing = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      if (existing.length) return ctx.reply({ embeds: [errorEmbed(`webhook \`${name}\` already exists.`)] });
      try {
        const wh = await (ch as any).createWebhook({ name: `${name} (villain)` });
        await db.insert(managedWebhooks).values({ guildId, identifier: name, webhookId: wh.id, webhookToken: wh.token!, channelId: ch.id });
        return ctx.reply({ embeds: [successEmbed(`webhook \`${name}\` created in <#${ch.id}>.`)] });
      } catch {
        return ctx.reply({ embeds: [errorEmbed("Failed to create **webhook**. check my **permissions**.")] });
      }
    }

    if (sub === "edit") {
      const messageLink = name ?? "";
      const match = messageLink.match(/^https?:\/\/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)(?:\?.*)?$/i);
      if (!match || match[1] !== guildId) return ctx.reply({ embeds: [errorEmbed("Provide a valid message link from this server.")] });
      const [, , channelId, messageId] = match;
      const messageText = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!messageText) return ctx.reply({ embeds: [errorEmbed("Provide the replacement message or embed script.")] });
      const rows = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.channelId, channelId!)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No Villain-managed webhook is registered in that message channel.")] });
      const { embeds, content } = parseScript(messageText);
      for (const row of rows) {
        try {
          const client = new WebhookClient({ id: row.webhookId, token: row.webhookToken });
          await client.editMessage(messageId!, { content: content ?? messageText, embeds });
          return ctx.reply({ embeds: [successEmbed("webhook message edited.")] });
        } catch { /* Try another managed webhook in the same channel. */ }
      }
      return ctx.reply({ embeds: [errorEmbed("Could not edit that message. It may not have been sent by a Villain-managed webhook, or the webhook token is no longer valid.")] });
    }
    if (sub === "lock" || sub === "unlock") {
      if (!name) return ctx.reply({ embeds: [errorEmbed("Provide the webhook name to " + sub + ".")] });
      const rows = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("webhook " + name + " not found.")] });
      const row = rows[0]!;
      if (sub === "lock") {
        if (row.locked) return ctx.reply({ embeds: [errorEmbed("webhook " + name + " is already locked.")] });
        try {
          const client = new WebhookClient({ id: row.webhookId, token: row.webhookToken });
          await client.delete("Webhook locked; previous token revoked");
          await db.update(managedWebhooks).set({ locked: true }).where(eq(managedWebhooks.id, row.id));
          return ctx.reply({ embeds: [successEmbed("webhook " + name + " locked. Its previous token has been revoked.")] });
        } catch {
          return ctx.reply({ embeds: [errorEmbed("Could not revoke the webhook token. It was not marked as locked.")] });
        }
      }
      if (!row.locked) return ctx.reply({ embeds: [errorEmbed("webhook " + name + " is not locked.")] });
      try {
        const channel = await ctx.guild.channels.fetch(row.channelId);
        if (!channel?.isTextBased() || !("createWebhook" in channel)) return ctx.reply({ embeds: [errorEmbed("The original channel is unavailable or cannot host webhooks.")] });
        const replacement = await (channel as any).createWebhook({ name: name + " (villain)" });
        if (!replacement.token) {
          await replacement.delete().catch(() => {});
          return ctx.reply({ embeds: [errorEmbed("Discord did not return a replacement webhook token.")] });
        }
        await db.update(managedWebhooks).set({ webhookId: replacement.id, webhookToken: replacement.token, locked: false }).where(eq(managedWebhooks.id, row.id));
        return ctx.reply({ embeds: [successEmbed("webhook " + name + " unlocked with a new token. The previous token remains revoked.")] });
      } catch {
        return ctx.reply({ embeds: [errorEmbed("Could not recreate the webhook. Check Manage Webhooks permission in its original channel.")] });
      }
    }

    if (sub === "send") {
      if (!name) return ctx.reply({ embeds: [errorEmbed("Provide the **webhook** name.")] });
      const messageText = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!messageText) return ctx.reply({ embeds: [errorEmbed("Provide a message to send.")] });
      const rows = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`webhook \`${name}\` not found.`)] });
      const wh = rows[0];
      if (wh.locked) return ctx.reply({ embeds: [errorEmbed(`webhook \`${name}\` is locked. Use webhook unlock ${name} first.`)] });
      try {
        const client = new WebhookClient({ id: wh.webhookId, token: wh.webhookToken });
        const { embeds, content } = parseScript(messageText);
        const usernameOverride = ctx.getString("username") ?? undefined;
        const avatarOverride = ctx.getString("avatar") ?? undefined;
        await client.send({ content: content ?? messageText, embeds, username: usernameOverride, avatarURL: avatarOverride });
        return ctx.reply({ embeds: [successEmbed(`message sent via \`${name}\`.`)] });
      } catch {
        return ctx.reply({ embeds: [errorEmbed("Failed to send **webhook** message.")] });
      }
    }

    if (sub === "delete" || sub === "remove") {
      if (!name) return ctx.reply({ embeds: [errorEmbed("Provide the **webhook** name.")] });
      const rows = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`webhook \`${name}\` not found.`)] });
      const wh = rows[0];
      try {
        const client = new WebhookClient({ id: wh.webhookId, token: wh.webhookToken });
        await client.delete();
      } catch {}
      await db.delete(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      return ctx.reply({ embeds: [successEmbed(`webhook \`${name}\` deleted.`)] });
    }

    if (sub === "info") {
      if (!name) return ctx.reply({ embeds: [errorEmbed("Provide the **webhook** name.")] });
      const rows = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`webhook \`${name}\` not found.`)] });
      const wh = rows[0];
      return ctx.reply({ embeds: [brandEmbed({ title: `Webhook: ${wh.identifier}`, fields: [{ name: "channel", value: `<#${wh.channelId}>`, inline: true }, { name: "created", value: `<t:${Math.floor(wh.createdAt.getTime() / 1000)}:R>`, inline: true }, { name: "status", value: wh.locked ? "locked" : "active", inline: true }] })] });
    }

    return ctx.reply({ embeds: [brandEmbed({ description: "**subcommands:** create, send, edit, delete, list, info" })] });
  },
};
