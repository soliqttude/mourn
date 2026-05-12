import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "globalcooldown",
  description: "(Owner) Toggle global cooldown bypass — all economy cooldowns ignored.",
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    ownerState.globalCooldownBypass = !ownerState.globalCooldownBypass;
    const state = ownerState.globalCooldownBypass ? "**enabled**" : "**disabled**";
    return ctx.reply({
      embeds: [successEmbed(`global cooldown bypass ${state}. all economy cooldowns are now ${ownerState.globalCooldownBypass ? "bypassed" : "active"}.`)],
      ephemeral: true,
    });
  },
};
