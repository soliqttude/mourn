import { ActivityType, ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "statusrotate",
  description: "(Owner) Manage a rotating list of bot statuses.",
  usage: "statusrotate [action] [text] [interval]",
  examples: ["statusrotate"],
  category: "owner",
  ownerOnly: true,
  aliases: ["rotatestatus", "statusloop"],
  options: [
    { name: "action", description: "add | remove | list | start | stop", type: ApplicationCommandOptionType.String, required: true },
    { name: "text", description: "Status text (for add)", type: ApplicationCommandOptionType.String, required: false },
    { name: "interval", description: "Rotation interval in minutes (for start, default 5)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const text = ctx.getString("text") ?? ctx.args.slice(1).join(" ");

    if (action === "add") {
      if (!text) return ctx.reply({ embeds: [errorEmbed("Provide status text.")] });
      ownerState.statusRotation.push(text);
      return ctx.reply({ embeds: [successEmbed(`Added: **${text}**\nRotation has **${ownerState.statusRotation.length}** statuses.`)] });
    }

    if (action === "remove") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= ownerState.statusRotation.length)
        return ctx.reply({ embeds: [errorEmbed("Invalid index.")] });
      const removed = ownerState.statusRotation.splice(idx, 1)[0];
      return ctx.reply({ embeds: [successEmbed(`Removed: **${removed}**`)] });
    }

    if (action === "list") {
      if (!ownerState.statusRotation.length) return ctx.reply({ content: "No statuses in rotation." });
      const lines = ownerState.statusRotation.map((s, i) => `\`${i + 1}\` ${s}`);
      return ctx.reply({
        embeds: [new EmbedBuilder().setColor(0x0f1923).setTitle("🔄 Status Rotation").setDescription(lines.join("\n")).setTimestamp()],
      });
    }

    if (action === "start") {
      if (!ownerState.statusRotation.length) return ctx.reply({ embeds: [errorEmbed("Add some statuses first.")] });
      if (ownerState.statusRotationInterval) clearInterval(ownerState.statusRotationInterval);
      const mins = ctx.getNumber("interval") ?? 5;
      const rotate = () => {
        const status = ownerState.statusRotation[ownerState.statusRotationIndex % ownerState.statusRotation.length]!;
        ctx.client.user?.setPresence({ activities: [{ name: status, type: ActivityType.Playing }], status: "online" });
        ownerState.statusRotationIndex++;
      };
      rotate();
      ownerState.statusRotationInterval = setInterval(rotate, mins * 60_000);
      return ctx.reply({ embeds: [successEmbed(`Rotation started — cycling every **${mins} min**.`)] });
    }

    if (action === "stop") {
      if (ownerState.statusRotationInterval) { clearInterval(ownerState.statusRotationInterval); ownerState.statusRotationInterval = null; }
      return ctx.reply({ embeds: [successEmbed("Status rotation stopped.")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Valid actions: `add`, `remove`, `list`, `start`, `stop`.")] });
  },
};
