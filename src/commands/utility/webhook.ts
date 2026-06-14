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
  description: "Manage server webhooks. Subcommands: create, send, delete, list, info",
  category: "utility",
  permission: "manage_webhooks",
  guildOnly: true,
  usage: "webhook [create|send|delete|list|info] [args]",
  examples: [
    "webhook create alerts #general",
    "webhook send alerts Hello world!",
    "webhook delete alerts",
    "webhook list",
  ],
  options: [
    { name: "subcommand", description: "create | send | delete | list | info", type: ApplicationCommandOptionType.String, required: true },
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
      const lines = rows.map(r => `**${r.identifier}** → <#${r.channelId}>`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Server Webhooks", description: lines.join("\n") })] });
    }

    if (sub === "create") {
      if (!name) return ctx.reply({ embeds: [errorEmbed("Provide a name for the **webhook**.")] });
      const ch = ctx.getChannel("channel") ?? (ctx.args[2] ? resolveChannel(ctx.guild, ctx.args[2]) : ctx.channel);
      if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Provide a valid text **channel**.")] });
      const existing = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      if (existing.length) return ctx.reply({ embeds: [errorEmbed(`webhook \`${name}\` already exists.`)] });
      try {
        const wh = await (ch as any).createWebhook({ name: `${name} (bestmourn)` });
        await db.insert(managedWebhooks).values({ guildId, identifier: name, webhookId: wh.id, webhookToken: wh.token!, channelId: ch.id });
        return ctx.reply({ embeds: [successEmbed(`webhook \`${name}\` created in <#${ch.id}>.`)] });
      } catch {
        return ctx.reply({ embeds: [errorEmbed("Failed to create **webhook**. check my **permissions**.")] });
      }
    }

    if (sub === "send") {
      if (!name) return ctx.reply({ embeds: [errorEmbed("Provide the **webhook** name.")] });
      const messageText = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!messageText) return ctx.reply({ embeds: [errorEmbed("Provide a message to send.")] });
      const rows = await db.select().from(managedWebhooks).where(and(eq(managedWebhooks.guildId, guildId), eq(managedWebhooks.identifier, name)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`webhook \`${name}\` not found.`)] });
      const wh = rows[0];
      try {
        const client = new WebhookClient({ id: wh.webhookId, token: wh.webhookToken });
        const { embed, content } = parseScript(messageText);
        const usernameOverride = ctx.getString("username") ?? undefined;
        const avatarOverride = ctx.getString("avatar") ?? undefined;
        await client.send({ content: content ?? messageText, embeds: embed ? [embed] : [], username: usernameOverride, avatarURL: avatarOverride });
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
      return ctx.reply({ embeds: [brandEmbed({ title: `Webhook: ${wh.identifier}`, fields: [{ name: "channel", value: `<#${wh.channelId}>`, inline: true }, { name: "created", value: `<t:${Math.floor(wh.createdAt.getTime() / 1000)}:R>`, inline: true }] })] });
    }

    return ctx.reply({ embeds: [brandEmbed({ description: "**subcommands:** create, send, delete, list, info" })] });
  },
};
