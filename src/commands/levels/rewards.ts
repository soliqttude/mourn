import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levelRewards } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "rewards",
  description: "List all level role rewards.",
  usage: "rewards",
  examples: ["rewards"],
  category: "levels",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await db.select().from(levelRewards).where(eq(levelRewards.guildId, ctx.guild.id));
    if (!rows.length) return ctx.reply({ embeds: [brandEmbed({ title: "Level Rewards", description: "No rewards set. Use `/addreward` to add one.", page: "Levels" })] });
    const list = rows.sort((a, b) => a.level - b.level).map(r => `**Level ${r.level}** → <@&${r.roleId}>`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: "Level Rewards", description: list, page: "Levels" })] });
  },
};
