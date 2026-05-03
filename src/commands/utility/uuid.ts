import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import crypto from "crypto";
export const command: HybridCommand = {
  name: "uuid", aliases: ["generateid"], description: "Generate a random UUID v4.", category: "utility",
  async execute(ctx) {
    const id = crypto.randomUUID();
    return ctx.reply({ embeds: [brandEmbed({ title: "🆔 UUID Generator", description: `\`${id}\``, page: "UUID" })] });
  },
};
