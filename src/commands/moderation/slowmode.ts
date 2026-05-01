import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "slowmode",
  description: "Set slowmode for this channel (in seconds, 0 to disable).",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "seconds", description: "Slowmode (0-21600)", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    const sec = ctx.getNumber("seconds", true);
    if (sec === null || sec < 0 || sec > 21600) {
      return ctx.reply({ embeds: [errorEmbed("Seconds must be 0-21600.")] });
    }
    if (!ctx.channel || !("setRateLimitPerUser" in ctx.channel)) {
      return ctx.reply({ embeds: [errorEmbed("Cannot set slowmode here.")] });
    }
    try {
      await (ctx.channel as any).setRateLimitPerUser(sec);
      return ctx.reply({
        embeds: [successEmbed(sec === 0 ? "Slowmode disabled." : `Slowmode set to **${sec}s**.`)],
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
