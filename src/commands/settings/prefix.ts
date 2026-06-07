import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { userPrefixes } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "prefix",
  description: "View or change the server prefix. Use 'self' to set a personal prefix.",
  usage: "prefix [new_prefix | self <prefix> | self reset]",
  examples: ["prefix", "prefix ,", "prefix self !", "prefix self reset"],
  category: "settings",
  guildOnly: false,
  options: [
    { name: "action", description: "New prefix or 'self'", type: ApplicationCommandOptionType.String, required: false },
    { name: "value", description: "Prefix value (when using 'self')", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const value = ctx.getString("value") ?? ctx.args[1] ?? "";

    // ── self prefix ────────────────────────────────────────────────────────────
    if (action === "self") {
      if (!value || value === "view" || value === "") {
        const [row] = await db.select().from(userPrefixes).where(eq(userPrefixes.userId, ctx.user.id));
        return ctx.reply({ embeds: [brandEmbed({ title: "Your Prefix", description: row ? `\`${row.prefix}\`` : "not set — using server prefix" })] });
      }
      if (value === "reset" || value === "none" || value === "off") {
        await db.delete(userPrefixes).where(eq(userPrefixes.userId, ctx.user.id));
        return ctx.reply({ embeds: [successEmbed("personal prefix reset.") ] });
      }
      if (value.length < 1 || value.length > 5) return ctx.reply({ embeds: [errorEmbed("prefix must be 1-5 characters.")] });
      await db.insert(userPrefixes).values({ userId: ctx.user.id, prefix: value })
        .onConflictDoUpdate({ target: userPrefixes.userId, set: { prefix: value } });
      return ctx.reply({ embeds: [successEmbed(`personal prefix set to \`${value}\`. this overrides the server prefix for you.`)] });
    }

    // ── view ───────────────────────────────────────────────────────────────────
    if (!action) {
      if (ctx.guild) {
        const s = await getGuildSettings(ctx.guild.id);
        const [personal] = await db.select().from(userPrefixes).where(eq(userPrefixes.userId, ctx.user.id));
        const fields = [{ name: "server prefix", value: `\`${s.prefix}\``, inline: true }];
        if (personal) fields.push({ name: "your prefix", value: `\`${personal.prefix}\``, inline: true });
        return ctx.reply({ embeds: [brandEmbed({ title: "Prefix", fields })] });
      }
      return ctx.reply({ embeds: [brandEmbed({ title: "Prefix", description: "Use `,prefix <new>` to change the server prefix." })] });
    }

    // ── set server prefix ──────────────────────────────────────────────────────
    if (!ctx.guild) return ctx.reply({ embeds: [errorEmbed("use this in a server.")] });
    const { checkTier } = await import("../../lib/permissions.js");
    if (!ctx.member || !checkTier(ctx.member as any, "admin")) {
      return ctx.reply({ embeds: [errorEmbed("only admins can change the server prefix.")] });
    }
    if (action.length < 1 || action.length > 5) return ctx.reply({ embeds: [errorEmbed("prefix must be 1-5 characters.")] });
    await updateGuildSettings(ctx.guild.id, { prefix: action });
    return ctx.reply({ embeds: [successEmbed(`server prefix set to \`${action}\`.`)] });
  },
};
