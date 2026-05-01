import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

const TYPE_TO_KEY: Record<string, "modLogChannel" | "msgLogChannel" | "joinLogChannel" | "voiceLogChannel"> = {
  mod: "modLogChannel",
  message: "msgLogChannel",
  msg: "msgLogChannel",
  join: "joinLogChannel",
  voice: "voiceLogChannel",
};

export const command: HybridCommand = {
  name: "setlog",
  description: "Set a log channel.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "type", description: "mod | message | join | voice", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Channel", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const type = (ctx.getString("type", true) ?? "").toLowerCase();
    const channel = ctx.getChannel("channel", true);
    if (!channel) return ctx.reply({ embeds: [errorEmbed("Channel required.")] });
    const key = TYPE_TO_KEY[type];
    if (!key) {
      return ctx.reply({
        embeds: [errorEmbed("Type must be: mod, message, join, or voice.")],
      });
    }
    await updateGuildSettings(ctx.guild.id, { [key]: channel.id });
    return ctx.reply({
      embeds: [successEmbed(`Set ${type} log to <#${channel.id}>.`)],
    });
  },
};
