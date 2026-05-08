import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "fakeban",
  description: "(Owner) Send a convincing fake ban embed to troll someone.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["trollban", "mockban"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Fake reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;

    const target = ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    const reason = ctx.getString("reason") ?? ctx.args[1] ?? "being too suspicious.";
    if (!userId) return ctx.reply({ content: "provide a user." });

    const user = await ctx.client.users.fetch(userId).catch(() => null);
    if (!user) return ctx.reply({ content: "user not found." });

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1a0000)
          .setAuthor({
            name: `banned · ${user.username}`,
            iconURL: user.displayAvatarURL(),
          })
          .setDescription(
            [
              `**reason** — ${reason}`,
              `**duration** — permanent`,
              `**appeals** — closed`,
            ].join("\n")
          )
          .setFooter({
            text: `${config.embedFooter} · ${ctx.guild.name}`,
            iconURL: ctx.guild.iconURL() ?? undefined,
          })
          .setTimestamp(),
      ],
    });
  },
};
