import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "felon",
  description: "Join the felon discord.",
  category: "custom",
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "join the cult.",
          description: `[**felon**](${config.felonInvite}) — ${config.felonInvite}`,
          page: "Felon",
        }),
      ],
    });
  },
};
