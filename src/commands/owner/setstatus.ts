import { ApplicationCommandOptionType, ActivityType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const typeMap: Record<string, ActivityType> = {
  playing: ActivityType.Playing,
  watching: ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
  streaming: ActivityType.Streaming,
};

export const command: HybridCommand = {
  name: "setstatus",
  description: "(Owner only) Change the bot's presence and activity.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "type", description: "playing | watching | listening | competing | streaming", type: ApplicationCommandOptionType.String, required: true },
    { name: "text", description: "Status text", type: ApplicationCommandOptionType.String, required: true },
    { name: "status", description: "online | idle | dnd | invisible", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const type = (ctx.getString("type", true) ?? "playing").toLowerCase();
    const text = ctx.getString("text", true) ?? "";
    const status = (ctx.getString("status") ?? "online") as "online" | "idle" | "dnd" | "invisible";
    const activityType = typeMap[type] ?? ActivityType.Playing;
    ctx.client.user?.setPresence({ activities: [{ name: text, type: activityType }], status });
    const eb = new EmbedBuilder()
      .setColor(config.successColor)
      .setTitle("🟢 Status Updated")
      .setDescription(`**${type.charAt(0).toUpperCase() + type.slice(1)}** ${text}\nStatus: \`${status}\``)
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
