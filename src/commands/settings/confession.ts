import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { hasAdminPerms } from "../../lib/permissions.js";

export const command: HybridCommand = {
  name: "confession",
  description: "Configure or send an anonymous confession.",
  usage: "confession [action] [channel] [message]",
  examples: ["confession"],
  category: "settings",
  guildOnly: true,
  options: [
    { name: "action", description: "setup · clear · send", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Confession channel (for setup)", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Your confession (for send)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "").toLowerCase();

    if (action === "setup") {
      if (!ctx.member || !hasAdminPerms(ctx.member))
        return ctx.reply({ embeds: [errorEmbed("Only admins can configure the confession channel.")], ephemeral: true } as any);
      const ch = ctx.getChannel("channel");
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Please specify a channel.")] });
      await updateGuildSettings(guild.id, { confessionChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`Confession channel set to <#${ch.id}>.`)] });
    }

    if (action === "clear") {
      if (!ctx.member || !hasAdminPerms(ctx.member))
        return ctx.reply({ embeds: [errorEmbed("Only admins can clear the confession channel.")], ephemeral: true } as any);
      await updateGuildSettings(guild.id, { confessionChannel: null });
      return ctx.reply({ embeds: [successEmbed("Confession channel cleared.")] });
    }

    if (action === "send") {
      const settings = await getGuildSettings(guild.id);
      if (!settings.confessionChannel)
        return ctx.reply({ embeds: [errorEmbed("No confession channel configured. Ask an admin to use `/confession setup`.")] });
      const text = ctx.getString("message") ?? ctx.rawArgs.split(/\s+/).slice(1).join(" ").trim();
      if (!text) return ctx.reply({ embeds: [errorEmbed("Please include your confession message.")] });
      const ch = guild.channels.cache.get(settings.confessionChannel) as any;
      if (!ch) return ctx.reply({ embeds: [errorEmbed("The confession channel no longer exists.")] });
      await ch.send({
        embeds: [brandEmbed({ title: "📬 Anonymous Confession", description: text, page: "Confessions" })],
      });
      return ctx.reply({ embeds: [successEmbed("Your confession has been sent anonymously.")], ephemeral: true } as any);
    }

    return ctx.reply({ embeds: [errorEmbed("Usage: `/confession setup #channel` · `/confession send [message]` · `/confession clear`")] });
  },
};
