import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "creator",
  description: "About the creator of Mourn.",
  category: "custom",
  aliases: ["dev", "developer", "author"],
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "geico. — Creator of Mourn",
          description: [
            "> Built **Mourn** from the ground up — solo.",
            "> Every command, every feature, every fix.",
          ].join("\n"),
          fields: [
            { name: "Discord",  value: "@udrs",                              inline: true },
            { name: "Handle",   value: "geico",                              inline: true },
            { name: "Project",  value: "Mourn — all-in-one Discord toolkit", inline: false },
            { name: "Feedback", value: "Got a bug or idea? Hit him up directly.", inline: false },
          ],
          page: "Creator",
        }),
      ],
    });
  },
};
