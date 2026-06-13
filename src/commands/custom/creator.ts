import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "creator",
  description: "About the creator of Mourn.",
  usage: "creator",
  examples: ["creator"],
  category: "custom",
  aliases: ["dev", "developer", "author"],
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "geico. — Creator of Mourn",
          description: [
            "> Built **Mourn** entirely from the ground up, alone.",
            "> Every command, every feature, every fix — personally.",
            "> A project driven by the desire to build something that actually works.",
          ].join("\n"),
          fields: [
            { name: "Discord",  value: "@udrs",                                          inline: true  },
            { name: "Handle",   value: "geico",                                          inline: true  },
            { name: "Feedback", value: "Have a bug report or feature idea? Reach out directly.", inline: false },
          ],
          page: "Creator",
        }),
      ],
    });
  },
};
