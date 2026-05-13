import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

const ALL_KEYS = ["modLogChannel", "msgLogChannel", "joinLogChannel", "voiceLogChannel"] as const;

const TYPE_TO_KEY: Record<string, typeof ALL_KEYS[number]> = {
  mod:     "modLogChannel",
  message: "msgLogChannel",
  msg:     "msgLogChannel",
  join:    "joinLogChannel",
  voice:   "voiceLogChannel",
};

export const command: HybridCommand = {
  name: "setlog",
  description: "Set a log channel. ,setlog all #channel | ,setlog mod #channel | ,setlog message #channel | ,setlog join #channel | ,setlog voice #channel",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "type", description: "all | mod | message | join | voice", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Channel to log into", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const type = (ctx.getString("type", true) ?? ctx.args[0] ?? "").toLowerCase();
    const channel = ctx.getChannel("channel", true) ?? (() => {
      const raw = ctx.args[1]?.replace(/[<#>]/g, "");
      return raw ? { id: raw } : null;
    })();

    if (!channel) return ctx.reply({ embeds: [errorEmbed("Channel required.")] });

    if (type === "all") {
      const update = Object.fromEntries(ALL_KEYS.map(k => [k, channel.id]));
      await updateGuildSettings(ctx.guild.id, update as any);
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "All Logs Set",
            description: `All log types are now pointing to <#${channel.id}>.`,
            fields: [
              { name: "🔨  Mod Log",     value: `<#${channel.id}>`, inline: true },
              { name: "💬  Message Log", value: `<#${channel.id}>`, inline: true },
              { name: "🚪  Join Log",    value: `<#${channel.id}>`, inline: true },
              { name: "🔊  Voice Log",   value: `<#${channel.id}>`, inline: true },
            ],
            page: "Logs",
          }),
        ],
      });
    }

    const key = TYPE_TO_KEY[type];
    if (!key) {
      return ctx.reply({
        embeds: [errorEmbed("Type must be: `all`, `mod`, `message`, `join`, or `voice`.")],
      });
    }

    await updateGuildSettings(ctx.guild.id, { [key]: channel.id });
    return ctx.reply({
      embeds: [successEmbed(`**${type}** log set to <#${channel.id}>.`)],
    });
  },
};
