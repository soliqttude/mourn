import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { and, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { invokeMessages } from "../../db/schema.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

const punishments = ["jail", "kick", "ban", "tempban", "softban", "hardban", "timeout", "warn"];
export const command: HybridCommand = {
  name: "invoke",
  description: "Customize moderation punishment messages and DMs.",
  category: "moderation",
  guildOnly: true,
  permission: "manage_guild",
  options: [
    { name: "punishment", description: "Punishment command", type: ApplicationCommandOptionType.String, required: true, choices: punishments.map(value => ({ name: value, value })) },
    { name: "target", description: "Where to apply the custom text", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "DM", value: "dm" }, { name: "Message", value: "message" }] },
    { name: "text", description: "Text to send. Supports {user.mention}, {user.tag}, {reason}, {moderator.mention}, {guild.name}.", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = ctx.getSubcommand(false);
    const punishment = (ctx.getString("punishment") ?? ctx.args[0] ?? "").toLowerCase();
    const target = (ctx.getString("target") ?? ctx.args[1] ?? "").toLowerCase();
    const value = ctx.getString("text") ?? ctx.args.slice(2).join(" ");
    if (!punishments.includes(punishment) || !["dm", "message"].includes(target)) {
      return ctx.reply({ embeds: [errorEmbed("Usage: /invoke set punishment:<punishment> target:<dm|message> text:<message>")] });
    }
    if (!value) {
      const rows = await db.select().from(invokeMessages).where(and(eq(invokeMessages.guildId, ctx.guild.id), eq(invokeMessages.command, punishment), eq(invokeMessages.type, target)));
      return ctx.reply({ embeds: [new EmbedBuilder().setTitle("Invoke message").setDescription(rows[0]?.content ?? "No custom message configured.").setColor(0x8b1e2d)] });
    }
    if (value.length > 2000) return ctx.reply({ embeds: [errorEmbed("Message must be 2,000 characters or fewer.")] });
    await db.insert(invokeMessages).values({ guildId: ctx.guild.id, command: punishment, type: target, content: value }).onConflictDoUpdate({
      target: [invokeMessages.guildId, invokeMessages.command, invokeMessages.type], set: { content: value },
    });
    return ctx.reply({ embeds: [successEmbed(`Custom ${target} message saved for **${punishment}**.`)] });
  },
};
