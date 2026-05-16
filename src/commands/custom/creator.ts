import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "creator",
  description: "About the creator of Bleed.",
  category: "custom",
  aliases: ["dev", "developer", "author"],
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "geico. — Creator of Bleed",
          description: [
            "> Built **Bleed** from the ground up — solo.",
            "> Every command, every feature, every fix.",
          ].join("\n"),
          fields: [
            { name: "Discord",  value: "@udrs",                              inline: true },
            { name: "Handle",   value: "geico",                              inline: true },
            { name: "Project",  value: "Bleed — all-in-one Discord toolkit", inline: false },
            { name: "Feedback", value: "Got a bug or idea? Hit him up directly.", inline: false },
          ],
          page: "Creator",
        }),
      ],
    });
  },
};
