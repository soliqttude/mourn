import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { and, desc, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { hardBans, antinukeAdmins } from "../../db/schema.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { resolveUser } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "hardban",
  aliases: ["hban", "permban"],
  description: "Permanently ban a user or view the server hardban list.",
  usage: "hardban <member> [reason] | hardban list",
  examples: ["hardban @member repeated raids", "hardban list"],
  category: "moderation",
  guildOnly: true,
  options: [
    { name: "action", description: "Ban a member or list hardbans", type: ApplicationCommandOptionType.String, required: false, choices: [{ name: "ban", value: "ban" }, { name: "list", value: "list" }] },
    { name: "user", description: "User to hardban", type: ApplicationCommandOptionType.User, required: false },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false }
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const action = (ctx.getString("action") ?? (ctx.source === "prefix" && ctx.args[0]?.toLowerCase() === "list" ? "list" : "ban")).toLowerCase();
    const adminRows = await db.select().from(antinukeAdmins).where(and(eq(antinukeAdmins.guildId, guild.id), eq(antinukeAdmins.userId, ctx.user.id))).limit(1);
    const authorized = Boolean(ctx.member?.permissions.has(PermissionFlagsBits.Administrator) || adminRows.length);
    if (!authorized) return ctx.reply({ embeds: [errorEmbed("Administrator or an authorized Antinuke Admin is required.")] });

    if (action === "list") {
      const rows = await db.select().from(hardBans).where(eq(hardBans.guildId, guild.id)).orderBy(desc(hardBans.createdAt)).limit(50);
      if (!rows.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Hardbanned members").setDescription("No hardbans are recorded for this server.")] });
      const lines = rows.map(row => "<@" + row.userId + "> — " + row.reason.slice(0, 130) + " · <t:" + Math.floor(row.createdAt.getTime() / 1000) + ":R>");
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Hardbanned members (" + rows.length + ")").setDescription(lines.join("\\n").slice(0, 4000))], allowedMentions: { parse: [] } });
    }
    if (action !== "ban") return ctx.reply({ embeds: [errorEmbed("Choose ban or list.")] });
    const target = ctx.source === "prefix" ? await resolveUser(ctx.client, ctx.args[0] ?? "") : await ctx.getUser("user", true);
    const reason = (ctx.getString("reason") ?? (ctx.source === "prefix" ? ctx.args.slice(1).join(" ").trim() : "")) || "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("Provide a member to hardban.")] });
    if (target.id === ctx.user.id || target.id === guild.ownerId) return ctx.reply({ embeds: [errorEmbed("You cannot hardban yourself or the server owner.")] });
    const already = await db.select().from(hardBans).where(and(eq(hardBans.guildId, guild.id), eq(hardBans.userId, target.id))).limit(1);
    if (already.length) return ctx.reply({ embeds: [errorEmbed("That member is already on the hardban list.")] });
    try {
      await guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: reason + " | hardban by " + ctx.user.tag });
      await db.insert(hardBans).values({ guildId: guild.id, userId: target.id, moderatorId: ctx.user.id, reason });
      return ctx.reply({ embeds: [successEmbed("Hardbanned **" + target.tag + "** and recorded the action.")] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Failed to hardban.")] });
    }
  }
};
