import type { HybridCommand } from "../../lib/command.js";
import { buildPanel } from "../../panels/router.js";
import { errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "panel",
  aliases: ["dashboard"],
  description: "Open the Bleed control panel.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return ctx.reply({ embeds: [errorEmbed("Server only.")] });
    const payload = await buildPanel("home", ctx.guild.id);
    return ctx.reply(payload as any);
  },
};
