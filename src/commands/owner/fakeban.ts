import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "fakeban",
  description: "(Owner) Send a fake ban announcement to troll someone.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["trollban", "mockban"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Fake reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    const reason = ctx.getString("reason") ?? ctx.args[1] ?? "Being too suspicious.";
    if (!userId) return ctx.reply({ content: "Provide a user." });

    const user = await ctx.client.users.fetch(userId).catch(() => null);
    if (!user) return ctx.reply({ content: "User not found." });

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("🔨 BAN HAMMER DEPLOYED")
          .setDescription([
            `**${user.tag}** has been permanently banned from this server.`,
            "",
            `**Reason:** ${reason}`,
            "",
            "**Duration:** Permanent",
            "**Appeals:** Disabled",
          ].join("\n"))
          .setThumbnail(user.displayAvatarURL())
          .setFooter({ text: `${config.embedFooter} • This is a troll command (no real ban occurred)`, iconURL: ctx.user.displayAvatarURL() })
          .setTimestamp(),
      ],
    });
  },
};
