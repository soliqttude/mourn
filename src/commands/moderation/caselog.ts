import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { and, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "caselog",
  description: "Display the details of a warning case.",
  category: "moderation",
  guildOnly: true,
  userPermissions: ["ManageMessages"],
  options: [{ name: "case", description: "Warning case ID", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const id = ctx.getNumber("case", true);
    if (!id || id < 1) return ctx.reply({ content: "Provide a valid case ID.", ephemeral: true });
    const row = (await db.select().from(warnings).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.id, id))).limit(1))[0];
    if (!row) return ctx.reply({ content: `Warning case #${id} was not found.`, ephemeral: true });
    const embed = new EmbedBuilder().setColor(0x8b1e2d).setTitle(`Case #${row.id} · Warning`).addFields(
      { name: "Member", value: `<@${row.userId}>`, inline: true },
      { name: "Moderator", value: `<@${row.moderatorId}>`, inline: true },
      { name: "Reason", value: row.reason },
      { name: "Date", value: `<t:${Math.floor(row.createdAt.getTime()/1000)}:F>` },
    ).setTimestamp(row.createdAt);
    return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
