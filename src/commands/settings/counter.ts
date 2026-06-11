import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { counters } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const TYPES = ["members", "humans", "bots", "channels", "roles", "boosts"] as const;
type CounterType = typeof TYPES[number];

export const command: HybridCommand = {
  name: "counter",
  description: "Set up auto-updating channel name counters.",
  usage: "counter (add|remove|list) [type] [channel] [template]",
  examples: [
    "counter add members #┊members Members: {count}",
    "counter add bots #┊bots Bots: {count}",
    "counter remove members",
    "counter list",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    {
      name: "action",
      description: "add, remove, or list",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
      ],
    },
    { name: "type", description: "members | humans | bots | channels | roles | boosts", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Voice channel to use as counter", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "template", description: "Name template — use {count} for the value", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();

    if (action === "list") {
      const rows = await db.select().from(counters).where(eq(counters.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No counters set up.")] });
      const lines = rows.map(r => `<#${r.channelId}> — **${r.type}** — \`${r.template}\``);
      return ctx.reply({ embeds: [brandEmbed({ description: `**counters [${rows.length}]**\n\n${lines.join("\n")}` })] });
    }

    const type = (ctx.getString("type") ?? ctx.args[1] ?? "").toLowerCase() as CounterType;
    if (!TYPES.includes(type as CounterType)) {
      return ctx.reply({ embeds: [errorEmbed(`invalid type. valid types: ${TYPES.join(", ")}.`)] });
    }

    if (action === "remove") {
      await db.delete(counters).where(and(eq(counters.guildId, ctx.guild.id), eq(counters.type, type)));
      return ctx.reply({ embeds: [successEmbed(`removed **${type}** counter.`)] });
    }

    if (action === "add") {
      const channel = ctx.getChannel("channel") ?? (() => {
        const raw = ctx.args[2]?.replace(/[<#>]/g, "");
        if (!raw) return null;
        return ctx.guild!.channels.cache.get(raw) ?? null;
      })();
      const template = ctx.getString("template") ?? ctx.args.slice(3).join(" ") || null;

      if (!channel) return ctx.reply({ embeds: [errorEmbed("Please specify a **channel**.")] });
      if (!template || !template.includes("{count}")) {
        return ctx.reply({ embeds: [errorEmbed("Template must include \`{count}\` e.g. \`Members: {count}\`.")] });
      }
      if (template.length > 100) {
        return ctx.reply({ embeds: [errorEmbed("Template must be 100 characters or less.")] });
      }

      await db.insert(counters)
        .values({ guildId: ctx.guild.id, channelId: channel.id, type, template })
        .onConflictDoUpdate({
          target: [counters.guildId, counters.type],
          set: { channelId: channel.id, template },
        });

      return ctx.reply({ embeds: [successEmbed(`counter set up — **${type}** → <#${channel.id}> — \`${template}\`.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid action. use \`add\`, \`remove\`, or \`list\`.")] });
  },
};
