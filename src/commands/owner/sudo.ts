import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { findCommand } from "../../handlers/registry.js";
import { buildPrefixContext } from "../../lib/contextFactory.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "sudo",
  description: "(Owner) Run a command as another user.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["runas"],
  options: [
    { name: "user", description: "User to impersonate", type: ApplicationCommandOptionType.User, required: true },
    { name: "command", description: "Command + args to run", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;

    const targetUser = await ctx.getUser("user");
    const cmdStr = ctx.getString("command") ?? ctx.args.slice(1).join(" ");
    if (!targetUser || !cmdStr) return ctx.reply({ embeds: [errorEmbed("Provide a user and command.")] });

    const parts = cmdStr.trim().split(/\s+/);
    const cmdName = parts.shift()!;
    const cmd = findCommand(cmdName);
    if (!cmd) return ctx.reply({ embeds: [errorEmbed(`Command \`${cmdName}\` not found.`)] });

    const raw = ctx.raw as any;
    const message = raw.channel ? raw : null;
    if (!message) return ctx.reply({ embeds: [errorEmbed("Can only sudo via prefix.") ]});

    const fakeMsg = Object.create(message);
    fakeMsg.author = targetUser;
    fakeMsg.member = await ctx.guild.members.fetch(targetUser.id).catch(() => message.member);

    const spoofCtx = await buildPrefixContext(
      ctx.client, fakeMsg, parts, parts.join(" "), ctx.prefix,
      (cmd.options as { name: string; type: number }[] | undefined) ?? []
    );

    try {
      await cmd.execute(spoofCtx);
      return ctx.reply({ embeds: [successEmbed(`Ran \`${cmdName}\` as **${targetUser.tag}**.`)], ephemeral: true } as any);
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed(`Failed: ${(err as Error).message}`)] });
    }
  },
};
