import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "watchlist",
  description: "(Owner) Watch a user — get DM'd every time they run a command.",
  usage: "watchlist [action] [user_id]",
  examples: ["watchlist"],
  category: "owner",
  ownerOnly: true,
  aliases: ["watch"],
  options: [
    { name: "action", description: "add | remove | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "user_id", description: "User ID", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const id = ctx.getString("user_id") ?? ctx.args[1];

    if (action === "list") {
      if (ownerState.watchedUsers.size === 0) return ctx.reply({ embeds: [{ description: "No users on watchlist.", color: 0x0f1923 } as any] });
      const lines = [...ownerState.watchedUsers].map((id, i) => `\`${i + 1}\` <@${id}> \`${id}\``);
      return ctx.reply({
        embeds: [new EmbedBuilder().setColor(0x0f1923).setTitle("👁️ Watchlist").setDescription(lines.join("\n")).setTimestamp()],
      });
    }
    if (!id) return ctx.reply({ embeds: [errorEmbed("Provide a **user** ID.")] });
    if (action === "add") {
      ownerState.watchedUsers.add(id);
      return ctx.reply({ embeds: [successEmbed(`Added \`${id}\` to watchlist. You'll be DM'd when they run commands.`)] });
    }
    if (action === "remove") {
      ownerState.watchedUsers.delete(id);
      return ctx.reply({ embeds: [successEmbed(`Removed \`${id}\` from watchlist.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("Valid actions: `add`, `remove`, `list`.")] });
  },
};
