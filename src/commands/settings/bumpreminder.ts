import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "bumpreminder",
  aliases: ["setbump", "bumpchannel"],
  description: "Configure the Disboard bump reminder system.",
  usage: "bumpreminder <channel|message|thankyou|autolock|autoclean|config|disable> [args]",
  examples: [
    "bumpreminder channel #bumps",
    "bumpreminder message it's time to bump! use /bump",
    "bumpreminder thankyou thanks for bumping! ❤️",
    "bumpreminder autolock on",
    "bumpreminder autoclean on",
    "bumpreminder config",
  ],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "channel | message | thankyou | autolock | autoclean | config | disable", type: ApplicationCommandOptionType.String, required: true,
      choices: [
        { name: "channel", value: "channel" }, { name: "message", value: "message" },
        { name: "thankyou", value: "thankyou" }, { name: "autolock", value: "autolock" },
        { name: "autoclean", value: "autoclean" }, { name: "config", value: "config" },
        { name: "disable", value: "disable" },
      ] },
    { name: "value", description: "Channel, message text, or on/off", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Bump reminder channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const val = ctx.getString("value") ?? ctx.args.slice(1).join(" ");

    if (sub === "config") {
      const s = await getGuildSettings(ctx.guild.id);
      return ctx.reply({ embeds: [brandEmbed({
        title: "Bump Reminder",
        fields: [
          { name: "channel", value: s.bumpChannel ? `<#${s.bumpChannel}>` : "not set", inline: true },
          { name: "autolock", value: (s as any).bumpAutolock ? "on" : "off", inline: true },
          { name: "autoclean", value: (s as any).bumpAutoclean ? "on" : "off", inline: true },
          { name: "reminder message", value: (s as any).bumpMessage ?? "*(default)*", inline: false },
          { name: "thank-you message", value: (s as any).bumpThankyou ?? "*(default)*", inline: false },
        ],
      })] });
    }

    if (sub === "disable") {
      await updateGuildSettings(ctx.guild.id, { bumpChannel: null });
      return ctx.reply({ embeds: [successEmbed("Bump reminders disabled.")] });
    }

    if (sub === "channel") {
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(val.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Please provide a **channel**.")] });
      await updateGuildSettings(ctx.guild.id, { bumpChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`bump reminders set to <#${ch.id}>. i'll ping every 2 hours.`)] });
    }

    if (sub === "message") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("Please provide a message.")] });
      await updateGuildSettings(ctx.guild.id, { bumpMessage: val } as any);
      return ctx.reply({ embeds: [successEmbed("Bump reminder message updated.")] });
    }

    if (sub === "thankyou") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("Please provide a thank-you message.")] });
      await updateGuildSettings(ctx.guild.id, { bumpThankyou: val } as any);
      return ctx.reply({ embeds: [successEmbed("Bump thank-you message updated.")] });
    }

    if (sub === "autolock") {
      const on = val === "on" || val === "true";
      await updateGuildSettings(ctx.guild.id, { bumpAutolock: on } as any);
      return ctx.reply({ embeds: [successEmbed(`autolock ${on ? "enabled — channel will lock until bumped" : "disabled"}.`)] });
    }

    if (sub === "autoclean") {
      const on = val === "on" || val === "true";
      await updateGuildSettings(ctx.guild.id, { bumpAutoclean: on } as any);
      return ctx.reply({ embeds: [successEmbed(`autoclean ${on ? "enabled — non-bump messages will be deleted" : "disabled"}.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand.")] });
  },
};
