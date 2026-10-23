import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "invite",
  description: "Invite Promise to your server.",
  usage: "invite",
  examples: ["invite"],
  category: "custom",
  async execute(ctx) {
    const link = config.botInviteUrl || null;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "invite promise.",
          description: link
            ? `add **promise** to your server:\n\n[**click here to invite**](${link})\n${link}`
            : "promise isn't publicly available yet.\n\nstay tuned — it's coming.",
          page: "Invite",
        }),
      ],
    });
  },
};
