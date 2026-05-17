import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "nuke",
  aliases: ["clearchannel", "wipe"],
  description: "Clone this channel and delete the original, wiping all messages.",
  usage: "nuke",
  examples: ["nuke"],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const channel = ctx.channel as any;
    if (!channel?.clone) return ctx.reply({ embeds: [errorEmbed("Cannot nuke this channel type.")] });
    if (ctx.source === "slash") await ctx.defer(true);
    try {
      const pos: number = channel.rawPosition ?? 0;
      const cloned = await channel.clone({ reason: `Nuked by ${ctx.user.tag}` });
      try { await cloned.setPosition(pos); } catch { /* ignore */ }
      await channel.delete(`Nuked by ${ctx.user.tag}`);
      await cloned.send({ embeds: [successEmbed("💥 This channel was nuked.")] });
      if (ctx.source === "slash") {
        try { await ctx.reply({ content: "✅ Channel nuked.", ephemeral: true } as any); } catch { /* interaction expired or already replied */ }
      }
    } catch {
      try { return ctx.reply({ embeds: [errorEmbed("Failed to nuke. Check my permissions.")] }); } catch { /* channel deleted */ }
    }
  },
};
