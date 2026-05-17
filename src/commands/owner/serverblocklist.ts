import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { blacklist } from "../../db/schema.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "serverblocklist",
  description: "(Owner) Show all blacklisted users.",
  usage: "serverblocklist",
  examples: ["serverblocklist"],
  category: "owner",
  ownerOnly: true,
  aliases: ["blocklist", "blist"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const rows = await db.select().from(blacklist).limit(50);
    if (!rows.length) return ctx.reply({ content: "No users are blacklisted." });
    const lines = rows.map((r, i) =>
      `\`${i + 1}\` \`${r.userId}\` — ${r.reason ?? "no reason"} <t:${Math.floor(r.createdAt.getTime() / 1000)}:R>`
    );
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle(`🚫 Blacklist — ${rows.length} users`)
          .setDescription(lines.join("\n"))
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
