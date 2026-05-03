import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "website",
  description: "Visit the Mourn website.",
  category: "custom",
  aliases: ["web", "site"],
  async execute(ctx) {
    const site = (config as any).websiteUrl || null;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "mourn — website.",
          description: site
            ? `**mourn's** official site:\n\n[**visit mourn**](${site})\n${site}`
            : "mourn's website is currently in the works.\n\ncheck back soon.",
          page: "Website",
        }),
      ],
    });
  },
};
