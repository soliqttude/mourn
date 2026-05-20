import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { lastfmAccounts } from "../../db/schema.js";
import { getUserInfo } from "../../features/lastfm.js";

export const command: HybridCommand = {
  name: "fmset",
  aliases: ["lastfmset", "setfm", "setlastfm"],
  description: "Link your Last.fm account to use music commands.",
  usage: "fmset [username]",
  examples: ["fmset lastfmuser"],
  category: "lastfm",
  options: [
    { name: "username", description: "Your Last.fm username", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const username = ctx.getString("username", true) ?? ctx.args[0];
    if (!username) return ctx.reply({ embeds: [errorEmbed("please provide your last.fm username.")] });
    try {
      const info = await getUserInfo(username);
      await db.insert(lastfmAccounts)
        .values({ userId: ctx.user.id, username: info.name })
        .onConflictDoUpdate({ target: lastfmAccounts.userId, set: { username: info.name } });
      return ctx.reply({ embeds: [successEmbed(`linked your account to **${info.name}** on last.fm.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("couldn't find that last.fm username. make sure it's spelled correctly.")] });
    }
  },
};
