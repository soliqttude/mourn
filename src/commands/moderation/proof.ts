import { ApplicationCommandOptionType, ApplicationCommandOptionData, EmbedBuilder, Message } from "discord.js";
import { and, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { caseProofs, warnings } from "../../db/schema.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

const caseOption = { name: "case", description: "Warning case ID", type: ApplicationCommandOptionType.Integer, required: true };
const options: ApplicationCommandOptionData[] = [
  { type: ApplicationCommandOptionType.Subcommand, name: "set", description: "Set the case explanation and any attached proof", options: [caseOption, { name: "explanation", description: "Evidence explanation", type: ApplicationCommandOptionType.String, required: true }] },
  { type: ApplicationCommandOptionType.Subcommand, name: "add", description: "Add a proof attachment URL", options: [caseOption, { name: "media", description: "Attachment URL", type: ApplicationCommandOptionType.String, required: true }] },
  { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Remove a proof attachment by index", options: [caseOption, { name: "index", description: "1-based attachment index", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }] },
  { type: ApplicationCommandOptionType.Subcommand, name: "list", description: "List proof attachments", options: [caseOption] },
  { type: ApplicationCommandOptionType.Subcommand, name: "view", description: "View proof details", options: [caseOption] }
];

export const command: HybridCommand = {
  name: "proof",
  description: "Manage evidence attached to moderation warning cases.",
  category: "moderation",
  permission: "manage_messages",
  guildOnly: true,
  options,
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const prefixAction = ctx.source === "prefix" ? (ctx.args[0] ?? "").toLowerCase() : "";
    const action = ctx.getSubcommand() ?? prefixAction;
    const caseId = ctx.getNumber("case") ?? (ctx.source === "prefix" ? Number(ctx.args[1]) : NaN);
    if (!["set", "add", "remove", "list", "view"].includes(action)) {
      return ctx.reply({ embeds: [errorEmbed("Use proof set, add, remove, list, or view with a case ID.")] });
    }
    if (!Number.isSafeInteger(caseId) || caseId < 1) return ctx.reply({ embeds: [errorEmbed("Provide a valid case ID.")] });
    const warning = await db.select().from(warnings).where(and(eq(warnings.guildId, guild.id), eq(warnings.id, caseId))).limit(1);
    if (!warning.length) return ctx.reply({ embeds: [errorEmbed("That moderation case does not exist in this server.")] });
    const existing = (await db.select().from(caseProofs).where(and(eq(caseProofs.guildId, guild.id), eq(caseProofs.caseId, caseId))).limit(1))[0];
    const rawAttachments = ctx.source === "prefix" ? [...((ctx.raw as Message).attachments?.values?.() ?? [])].map(a => a.url) : [];
    const uploaded = rawAttachments.filter(url => /^https?:\/\//i.test(url));
    const argumentText = ctx.source === "prefix" ? ctx.args.slice(2).join(" ").trim() : "";
    if (action === "set") {
      const explanation = ctx.getString("explanation") ?? argumentText;
      if (!explanation) return ctx.reply({ embeds: [errorEmbed("Provide an explanation for this case's proof.")] });
      const attachmentUrls = uploaded.length ? uploaded : (existing?.attachmentUrls ?? []);
      await db.insert(caseProofs).values({ guildId: guild.id, caseId, explanation, attachmentUrls, updatedBy: ctx.user.id })
        .onConflictDoUpdate({ target: [caseProofs.guildId, caseProofs.caseId], set: { explanation, attachmentUrls, updatedBy: ctx.user.id, updatedAt: new Date() } });
      return ctx.reply({ embeds: [successEmbed("Updated proof for case #" + caseId + (uploaded.length ? " and saved " + uploaded.length + " uploaded attachment(s)." : "."))] });
    }
    if (action === "add") {
      const media = ctx.getString("media") ?? argumentText;
      if (!media || !/^https?:\/\/\S+$/i.test(media)) return ctx.reply({ embeds: [errorEmbed("Provide a valid HTTP or HTTPS media URL.")] });
      if (!existing) return ctx.reply({ embeds: [errorEmbed("Set an explanation for this case first with proof set.")] });
      const attachmentUrls = [...existing.attachmentUrls, media].slice(0, 10);
      await db.update(caseProofs).set({ attachmentUrls, updatedBy: ctx.user.id, updatedAt: new Date() }).where(and(eq(caseProofs.guildId, guild.id), eq(caseProofs.caseId, caseId)));
      return ctx.reply({ embeds: [successEmbed("Added proof attachment " + attachmentUrls.length + " to case #" + caseId + ".")] });
    }
    if (!existing) return ctx.reply({ embeds: [errorEmbed("No proof is recorded for case #" + caseId + ".")] });
    if (action === "remove") {
      const index = (ctx.getNumber("index") ?? Number(ctx.args[2])) - 1;
      if (!Number.isSafeInteger(index) || index < 0 || index >= existing.attachmentUrls.length) return ctx.reply({ embeds: [errorEmbed("Provide a valid attachment index. Use proof list to view the indexes.")] });
      const attachmentUrls = existing.attachmentUrls.filter((_url, i) => i !== index);
      await db.update(caseProofs).set({ attachmentUrls, updatedBy: ctx.user.id, updatedAt: new Date() }).where(and(eq(caseProofs.guildId, guild.id), eq(caseProofs.caseId, caseId)));
      return ctx.reply({ embeds: [successEmbed("Removed proof attachment " + (index + 1) + " from case #" + caseId + ".")] });
    }
    if (action === "list") {
      const lines = existing.attachmentUrls.map((url, i) => (i + 1) + ". " + url);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Proof attachments · Case #" + caseId).setDescription(lines.join("\\n").slice(0, 4000) || "No attachments recorded.")] });
    }
    const description = (existing.explanation || "No explanation recorded.") + (existing.attachmentUrls.length ? "\\n\\n" + existing.attachmentUrls.map((url, i) => (i + 1) + ". " + url).join("\\n") : "\\n\\nNo attachments recorded.");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Case proof · #" + caseId).setDescription(description.slice(0, 4000)).setFooter({ text: "Updated by " + existing.updatedBy }).setTimestamp(existing.updatedAt)] });
  }
};
