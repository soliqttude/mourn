import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "fakelag",
  description: "(Owner) Toggle fake lag — all commands take 2–7s to respond.",
  category: "owner",
  ownerOnly: true,
  aliases: ["lag"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    ownerState.fakeLagActive = !ownerState.fakeLagActive;
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(ownerState.fakeLagActive ? 0xff1744 : 0x00e676)
          .setTitle(ownerState.fakeLagActive ? "⏳ Fake Lag ON" : "✅ Fake Lag OFF")
          .setDescription(ownerState.fakeLagActive
            ? "All commands now take 2–7 seconds to respond for everyone except you."
            : "Bot response time back to normal."
          ).setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
