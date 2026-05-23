import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseScript } from "../../lib/scripting.js";
import { resolveChannel } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "createembed",
  aliases: ["ce"],
  description: "Send a scripted embed to a channel. Supports embed scripting syntax.",
  category: "utility",
  permission: "mod",
  guildOnly: true,
  usage: "createembed [#channel] [embed code]",
  examples: [
    "createembed #general {embed}{title: Hello}{description: World}",
    "createembed #announcements {embed}{color: #ff0000}{title: Important}",
  ],
  options: [
    { name: "channel", description: "Channel to post in", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "code", description: "Embed scripting code", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel") ?? (ctx.args[0] ? resolveChannel(ctx.guild, ctx.args[0]) : null);
    if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("provide a valid text channel.")] });
    const code = ctx.getString("code") ?? ctx.args.slice(1).join(" ");
    if (!code) return ctx.reply({ embeds: [errorEmbed("provide embed code.")] });
    const { embed, content } = parseScript(code, { user: ctx.member ?? undefined, guild: ctx.guild });
    try {
      await (ch as any).send({ content: content ?? undefined, embeds: embed ? [embed] : [] });
      return ctx.reply({ embeds: [successEmbed(`embed sent to <#${ch.id}>.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("failed to send embed. check my permissions.")] });
    }
  },
};
