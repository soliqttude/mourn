import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "forcenick",
  description: "(Owner) Force-change any member's nickname.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["fnick", "forcename"],
  options: [
    { name: "user", description: "Target member", type: ApplicationCommandOptionType.User, required: true },
    { name: "nickname", description: "New nickname (leave blank to reset)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    const nick = ctx.getString("nickname") ?? ctx.args[1] ?? null;
    if (!userId) return ctx.reply({ content: "Provide a user." });
    try {
      const member = await ctx.guild.members.fetch(userId);
      const old = member.nickname ?? member.user.username;
      await member.setNickname(nick, `Force nick by owner`);
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00e676)
            .setTitle("✏️ Nickname Forced")
            .addFields(
              { name: "User", value: `${member.user.tag}`, inline: true },
              { name: "Before", value: old, inline: true },
              { name: "After", value: nick ?? "*(reset)*", inline: true },
            )
            .setFooter({ text: `${config.embedFooter} • Owner Action` })
            .setTimestamp(),
        ],
        ephemeral: true,
      } as any);
    } catch (err: any) {
      return ctx.reply({ content: `Failed: ${err.message}` });
    }
  },
};
