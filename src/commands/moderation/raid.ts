import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { PermissionFlagsBits } from "discord.js";

const ACTIONS = ["ban", "kick", "timeout"] as const;
type Action = typeof ACTIONS[number];

export const command: HybridCommand = {
  name: "raid",
  aliases: ["simulateraid", "testraids"],
  description: "Handle a raid — mass-action members who joined recently with a new account.",
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  usage: "raid (ban|kick|timeout) [--minutes <n>] [--age <days>] [--reason <text>]",
  examples: ["raid ban --minutes 5 --age 7", "raid kick --minutes 10"],
  options: [
    { name: "action", description: "What to do: ban, kick, or timeout", type: ApplicationCommandOptionType.String, required: true, choices: ACTIONS.map((a) => ({ name: a, value: a })) },
    { name: "minutes", description: "Target members who joined in the last N minutes (default 10)", type: ApplicationCommandOptionType.Number, required: false },
    { name: "age", description: "Target accounts younger than N days (default 7)", type: ApplicationCommandOptionType.Number, required: false },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const action = (ctx.getString("action") ?? "ban") as Action;
    if (!ACTIONS.includes(action)) return ctx.reply({ embeds: [errorEmbed("Invalid action. use ban, kick, or timeout.")] });

    const minutes = ctx.getNumber("minutes") ?? 10;
    const ageDays = ctx.getNumber("age") ?? 7;
    const reason = ctx.getString("reason") ?? `raid cleanup — ${action}`;

    const me = guild.members.me;
    if (!me) return;
    if (action === "ban" && !me.permissions.has(PermissionFlagsBits.BanMembers))
      return ctx.reply({ embeds: [errorEmbed("I need **ban members** **permission**.")] });
    if (action === "kick" && !me.permissions.has(PermissionFlagsBits.KickMembers))
      return ctx.reply({ embeds: [errorEmbed("I need **kick members** **permission**.")] });
    if (action === "timeout" && !me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return ctx.reply({ embeds: [errorEmbed("I need **moderate members** **permission**.")] });

    await ctx.defer();

    const joinCutoff = Date.now() - minutes * 60 * 1000;
    const ageCutoff = Date.now() - ageDays * 86_400_000;

    await guild.members.fetch().catch(() => null);
    const targets = [...guild.members.cache.values()].filter(
      (m) =>
        !m.user.bot &&
        !m.permissions.has(PermissionFlagsBits.Administrator) &&
        m.joinedTimestamp !== null &&
        m.joinedTimestamp >= joinCutoff &&
        m.user.createdTimestamp >= ageCutoff
    );

    if (!targets.length) {
      return ctx.reply({
        embeds: [errorEmbed(`no members matched (joined within ${minutes}m + account younger than ${ageDays}d).`)],
      });
    }

    let actioned = 0;
    for (const member of targets) {
      if (action === "ban" && member.bannable) {
        await guild.members.ban(member.id, { reason: `${ctx.user.tag}: ${reason}` }).catch(() => {});
        actioned++;
      } else if (action === "kick" && member.kickable) {
        await member.kick(reason).catch(() => {});
        actioned++;
      } else if (action === "timeout" && member.moderatable) {
        await member.timeout(10 * 60 * 1000, reason).catch(() => {});
        actioned++;
      }
    }

    return ctx.reply({
      embeds: [successEmbed(
        `**${action}**ned **${actioned}** member(s)\n— joined within last ${minutes} minute(s)\n— account age < ${ageDays} day(s)\n— reason: ${reason}`,
        "moderation"
      )],
    });
  },
};
