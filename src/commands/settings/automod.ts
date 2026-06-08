import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "automod",
  description: "Configure auto-moderation settings.",
  category: "settings",
  aliases: ["automoderation"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "feature", description: "spam, links, invites, or caps", type: ApplicationCommandOptionType.String, required: true }, { name: "enabled", description: "Enable or disable", type: ApplicationCommandOptionType.Boolean, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const feature = (ctx.getString("feature") ?? ctx.args[0] ?? "").toLowerCase();
    const enabled = ctx.getBoolean ? ctx.getBoolean("enabled") : ctx.args[1] === "true";
    const valid = ["spam","links","invites","caps"];
    if (!valid.includes(feature)) return ctx.reply({ content: `Feature must be one of: ${valid.join(", ")}`, ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { [`automod_${feature}`]: enabled } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("⚙️ AutoMod").setDescription(`✅ AutoMod **${feature}** detection ${enabled ? "enabled" : "disabled"}.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
