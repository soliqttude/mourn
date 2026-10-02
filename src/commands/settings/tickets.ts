import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { ticketForms } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "ticketsetup",
  description: "configure the ticket system",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "ticketsetup <subcommand> [args]",
  examples: [
    "ticketsetup category #support-tickets",
    "ticketsetup supportrole @Support",
    "ticketsetup logs #ticket-logs",
    "ticketsetup topic add general",
    "ticketsetup topic add bug-report 🐛",
    "ticketsetup topic remove general",
    "ticketsetup topic list",
    "ticketsetup form add support issue paragraph true",
    "ticketsetup form remove support issue",
    "ticketsetup form list support",
    "ticketsetup config",
    "ticketsetup reset",
  ],
  options: [
    {
      name: "category",
      description: "set the category tickets are created in",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "channel", description: "the category channel", type: ApplicationCommandOptionType.Channel, required: true },
      ],
    },
    {
      name: "supportrole",
      description: "set the support role with access to all tickets",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "role", description: "the support role", type: ApplicationCommandOptionType.Role, required: true },
      ],
    },
    {
      name: "logs",
      description: "set the channel for ticket transcripts",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "channel", description: "the log channel", type: ApplicationCommandOptionType.Channel, required: true },
      ],
    },
    {
      name: "topic",
      description: "manage ticket topics (buttons on the panel)",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "add",
          description: "add a ticket topic",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            { name: "name", description: "topic name", type: ApplicationCommandOptionType.String, required: true },
            { name: "emoji", description: "button emoji", type: ApplicationCommandOptionType.String, required: false },
            { name: "description", description: "topic description", type: ApplicationCommandOptionType.String, required: false },
          ],
        },
        {
          name: "remove",
          description: "remove a ticket topic",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            { name: "name", description: "topic name to remove", type: ApplicationCommandOptionType.String, required: true },
          ],
        },
        {
          name: "list",
          description: "list all ticket topics",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    },
    {
      name: "form",
      description: "manage ticket forms",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        { name: "add", description: "add a form field", type: ApplicationCommandOptionType.Subcommand, options: [
          { name: "topic", description: "topic", type: ApplicationCommandOptionType.String, required: true },
          { name: "label", description: "field label", type: ApplicationCommandOptionType.String, required: true },
          { name: "style", description: "field style", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "short", value: "short" }, { name: "paragraph", value: "paragraph" }] },
          { name: "required", description: "required", type: ApplicationCommandOptionType.Boolean, required: false },
          { name: "placeholder", description: "placeholder", type: ApplicationCommandOptionType.String, required: false },
        ] },
        { name: "remove", description: "remove a form field", type: ApplicationCommandOptionType.Subcommand, options: [
          { name: "topic", description: "topic", type: ApplicationCommandOptionType.String, required: true },
          { name: "label", description: "field label", type: ApplicationCommandOptionType.String, required: true },
        ] },
        { name: "list", description: "list form fields", type: ApplicationCommandOptionType.Subcommand, options: [
          { name: "topic", description: "topic", type: ApplicationCommandOptionType.String, required: true },
        ] },
      ],
    },
    {
      name: "config",
      description: "view current ticket configuration",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "reset",
      description: "reset all ticket settings",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    // Prefix-mode: parse args
    const sub = ctx.source === "prefix" ? ctx.args[0]?.toLowerCase() : null;
    const sub2 = ctx.source === "prefix" ? ctx.args[1]?.toLowerCase() : null;

    // Determine subcommand from slash or prefix
    const getSlashSub = (): string => {
      if (ctx.source !== "slash") return "";
      const raw = ctx.raw as any;
      const grp = raw.options?.getSubcommandGroup?.(false);
      const cmd = raw.options?.getSubcommand?.(false);
      return grp ? `${grp} ${cmd}` : (cmd ?? "");
    };

    const slashSub = getSlashSub();

    // ── category ──────────────────────────────────────────────────────────────
    if (slashSub === "category" || sub === "category") {
      const ch = ctx.getChannel("channel");
      const channelArg = ch as any;
      if (!channelArg || channelArg.type !== ChannelType.GuildCategory) {
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid **category** **channel**.")] });
      }
      await updateGuildSettings(ctx.guild.id, { ticketCategory: channelArg.id });
      return ctx.reply({ embeds: [successEmbed(`ticket category set to **${channelArg.name}**`, "settings")] });
    }

    // ── supportrole ───────────────────────────────────────────────────────────
    if (slashSub === "supportrole" || sub === "supportrole") {
      const role = ctx.getRole("role");
      if (!role) return ctx.reply({ embeds: [errorEmbed("Please provide a valid **role**.")] });
      await updateGuildSettings(ctx.guild.id, { ticketSupportRole: role.id });
      return ctx.reply({ embeds: [successEmbed(`support role set to <@&${role.id}>`, "settings")] });
    }

    // ── logs ──────────────────────────────────────────────────────────────────
    if (slashSub === "logs" || sub === "logs") {
      const ch = ctx.getChannel("channel");
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Please provide a valid **channel**.")] });
      await updateGuildSettings(ctx.guild.id, { ticketLogChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`transcript log channel set to <#${ch.id}>`, "settings")] });
    }

    // ── topic add ─────────────────────────────────────────────────────────────
    if (slashSub === "topic add" || (sub === "topic" && sub2 === "add")) {
      const name = ctx.getString("name") ?? ctx.args[2];
      const emoji = ctx.getString("emoji") ?? ctx.args[3] ?? null;
      const description = ctx.getString("description") ?? null;
      if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a **topic** name.")] });

      const settings = await getGuildSettings(ctx.guild.id);
      const topics = settings.ticketTopics ?? [];
      if (topics.length >= 20) return ctx.reply({ embeds: [errorEmbed("Maximum of 20 topics allowed.")] });
      if (topics.some((t: any) => t.name.toLowerCase() === name.toLowerCase())) {
        return ctx.reply({ embeds: [errorEmbed(`a topic called **${name}** already exists.`)] });
      }

      topics.push({ name, ...(emoji ? { emoji } : {}), ...(description ? { description } : {}) });
      await updateGuildSettings(ctx.guild.id, { ticketTopics: topics });
      return ctx.reply({ embeds: [successEmbed(`topic **${name}** added.`, "settings")] });
    }

    // ── topic remove ──────────────────────────────────────────────────────────
    if (slashSub === "topic remove" || (sub === "topic" && sub2 === "remove")) {
      const name = ctx.getString("name") ?? ctx.args[2];
      if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a **topic** name.")] });

      const settings = await getGuildSettings(ctx.guild.id);
      const topics = (settings.ticketTopics ?? []).filter((t: any) => t.name.toLowerCase() !== name.toLowerCase());
      if (topics.length === (settings.ticketTopics ?? []).length) {
        return ctx.reply({ embeds: [errorEmbed(`no topic called **${name}** found.`)] });
      }
      await updateGuildSettings(ctx.guild.id, { ticketTopics: topics });
      return ctx.reply({ embeds: [successEmbed(`topic **${name}** removed.`, "settings")] });
    }

    // ── topic list ────────────────────────────────────────────────────────────
    if (slashSub === "topic list" || (sub === "topic" && sub2 === "list")) {
      const settings = await getGuildSettings(ctx.guild.id);
      const topics = settings.ticketTopics ?? [];
      if (!topics.length) return ctx.reply({ embeds: [errorEmbed("No topics configured.")] });
      const lines = topics.map((t: any, i: number) => `**${i + 1}.** ${t.emoji ? `${t.emoji} ` : ""}${t.name}${t.description ? ` — ${t.description}` : ""}`);
      return ctx.reply({
        embeds: [
          brandEmbed({ description: lines.join("\n"), authorName: "ticket topics", page: "settings" }),
        ],
      });
    }

    // ── forms ────────────────────────────────────────────────────────────────
    const formAction = ctx.source === "slash" ? ((ctx.raw as any).options?.getSubcommand?.(false) ?? "") : (ctx.args[2] ?? "").toLowerCase();
    const formGroup = ctx.source === "slash" ? ((ctx.raw as any).options?.getSubcommandGroup?.(false) ?? "") : (sub === "form" ? "form" : "");
    if (formGroup === "form") {
      const topic = ctx.getString("topic") ?? ctx.args[3];
      const label = ctx.getString("label") ?? ctx.args[4];
      const rows = topic ? await db.select().from(ticketForms).where(and(eq(ticketForms.guildId, ctx.guild.id), eq(ticketForms.topic, topic))) : [];
      const current = rows[0];
      const fields = current?.fields ?? [];
      if (formAction === "add") {
        if (!label) return ctx.reply({ embeds: [errorEmbed("provide a field label.")] });
        if (fields.length >= 5) return ctx.reply({ embeds: [errorEmbed("a ticket form can have a maximum of 5 fields.")] });
        const style = (ctx.getString("style") ?? ctx.args[5] ?? "short").toLowerCase();
        if (style !== "short" && style !== "paragraph") return ctx.reply({ embeds: [errorEmbed("style must be short or paragraph.")] });
        if (fields.some((x: any) => x.label.toLowerCase() === label.toLowerCase())) return ctx.reply({ embeds: [errorEmbed("that field already exists.")] });
        const field = { label: label.slice(0, 45), style, required: ctx.getBoolean?.("required") ?? true, placeholder: ctx.getString?.("placeholder")?.slice(0, 100) };
        if (current) await db.update(ticketForms).set({ fields: [...fields, field as any] }).where(eq(ticketForms.id, current.id));
        else await db.insert(ticketForms).values({ guildId: ctx.guild.id, topic, fields: [field as any] });
        return ctx.reply({ embeds: [successEmbed("ticket form field added.")] });
      }
      if (formAction === "remove") {
        if (!current) return ctx.reply({ embeds: [errorEmbed("no form exists for that topic.")] });
        const next = fields.filter((x: any) => x.label.toLowerCase() !== (label ?? "").toLowerCase());
        if (next.length === fields.length) return ctx.reply({ embeds: [errorEmbed("field not found.")] });
        await db.update(ticketForms).set({ fields: next as any }).where(eq(ticketForms.id, current.id));
        return ctx.reply({ embeds: [successEmbed("ticket form field removed.")] });
      }
      if (formAction === "list") {
        if (!fields.length) return ctx.reply({ embeds: [errorEmbed("no fields configured for that topic.")] });
        return ctx.reply({ embeds: [brandEmbed({ title: "ticket form — " + topic, description: fields.map((x: any, i: number) => (i + 1) + ". **" + x.label + "** — " + x.style + (x.required === false ? " · optional" : " · required")).join("\n") })] });
      }
    }

    // ── config ────────────────────────────────────────────────────────────────
    if (slashSub === "config" || sub === "config") {
      const settings = await getGuildSettings(ctx.guild.id);
      const lines = [
        `**category** — ${settings.ticketCategory ? `<#${settings.ticketCategory}>` : "not set"}`,
        `**support role** — ${settings.ticketSupportRole ? `<@&${settings.ticketSupportRole}>` : "not set"}`,
        `**log channel** — ${settings.ticketLogChannel ? `<#${settings.ticketLogChannel}>` : "not set"}`,
        `**topics** — ${(settings.ticketTopics ?? []).length || "none configured"}`,
        `**tickets created** — ${settings.ticketCount ?? 0}`,
      ];
      return ctx.reply({
        embeds: [brandEmbed({ description: lines.join("\n"), authorName: "ticket configuration", page: "settings" })],
      });
    }

    // ── reset ─────────────────────────────────────────────────────────────────
    if (slashSub === "reset" || sub === "reset") {
      await updateGuildSettings(ctx.guild.id, {
        ticketCategory: null,
        ticketSupportRole: null,
        ticketLogChannel: null,
        ticketTopics: [],
        ticketCount: 0,
      });
      return ctx.reply({ embeds: [successEmbed("**Ticket** settings reset.", "settings")] });
    }

    return ctx.reply({
      embeds: [errorEmbed("Usage: `ticketsetup <**category**|supportrole|logs|**topic**|config|reset>`")],
    });
  },
};
