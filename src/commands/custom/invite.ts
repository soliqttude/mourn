import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "invite",
  description: "Invite Bleed to your server.",
  usage: "invite",
  examples: ["invite"],
  category: "custom",
  async execute(ctx) {
    const link = config.botInviteUrl || null;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "invite bleed.",
          description: link
            ? `add **bleed** to your server:\n\n[**click here to invite**](${link})\n${link}`
            : "bleed isn't publicly available yet.\n\nstay tuned — it's coming.",
          page: "Invite",
        }),
      ],
    });
  },
};
