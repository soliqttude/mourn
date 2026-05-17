import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "massban",
  aliases: ["mban", "bulkban"],
  description: "Ban multiple users by ID (space-separated list).",
  usage: "massban [ids] [reason]",
  examples: ["massban Rule violation"],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "ids", description: "Space-separated user IDs", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const raw = ctx.getString("ids", true) ?? ctx.rawArgs;
    const ids = raw.split(/\s+/).filter((id) => /^\d{17,19}$/.test(id));
    const reason = ctx.getString("reason") ?? "Massban";
    if (!ids.length) return ctx.reply({ embeds: [errorEmbed("No valid user IDs found.")] });
    await ctx.defer();
    let success = 0, failed = 0;
    for (const id of ids) {
      try {
        await guild.bans.create(id, { reason, deleteMessageSeconds: 86400 });
        success++;
      } catch { failed++; }
    }
    return ctx.reply({
      embeds: [brandEmbed({
        title: "Massban Complete",
        description: `Reason: ${reason}`,
        fields: [
          { name: "✅ Banned", value: `${success}`, inline: true },
          { name: "❌ Failed", value: `${failed}`, inline: true },
        ],
        page: "Moderation",
      })],
    });
  },
};
