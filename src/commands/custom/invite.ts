import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "invite",
  description: "Invite Mourn to your server.",
  category: "custom",
  async execute(ctx) {
    const link = config.botInviteUrl || null;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "invite mourn.",
          description: link
            ? `add **mourn** to your server:\n\n[**click here to invite**](${link})\n${link}`
            : "mourn isn't publicly available yet.\n\nstay tuned — it's coming.",
          page: "Invite",
        }),
      ],
    });
  },
};
