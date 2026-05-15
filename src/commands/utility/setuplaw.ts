import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "setuplaw",
  description: "Post the server rules embed with creation date, founder, and quick-link buttons.",
  category: "utility",
  guildOnly: true,
  aliases: ["serverlaw", "laws", "rules"],
  options: [
    {
      name: "chat_url",
      description: "Link for the 'chat' button (e.g. channel link)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "roles_url",
      description: "Link for the 'roles' button (e.g. channel link)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  async execute(ctx) {
    if (!ctx.guild) return;

    const member = ctx.member;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ embeds: [errorEmbed("You need **Manage Server** permission to use this.")] });
    }

    const guild = ctx.guild;

    let owner = guild.members.cache.get(guild.ownerId) ?? null;
    if (!owner) {
      owner = await guild.members.fetch(guild.ownerId).catch(() => null);
    }

    const createdAt = guild.createdAt;
    const creationStr = createdAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const founderStr = owner ? `${owner}` : `<@${guild.ownerId}>`;

    const description = [
      `__creation:__ ${creationStr}`,
      `__founder:__ ${founderStr}`,
      `follow discord [tos](https://discord.com/terms) & [guidelines](https://discord.com/guidelines)`,
      `**no gore, nsfw, advertising**`,
    ].join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x1a1a2e)
      .setDescription(description);

    const chatUrl = ctx.getString("chat_url") ?? ctx.args[0] ?? null;
    const rolesUrl = ctx.getString("roles_url") ?? ctx.args[1] ?? null;

    const isValidUrl = (url: string) => {
      try { new URL(url); return true; } catch { return false; }
    };

    const hasChatBtn = chatUrl && isValidUrl(chatUrl);
    const hasRolesBtn = rolesUrl && isValidUrl(rolesUrl);

    if (hasChatBtn || hasRolesBtn) {
      const row = new ActionRowBuilder<ButtonBuilder>();

      if (hasChatBtn) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel("chat")
            .setStyle(ButtonStyle.Link)
            .setURL(chatUrl!)
            .setEmoji("↗️"),
        );
      }

      if (hasRolesBtn) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel("roles")
            .setStyle(ButtonStyle.Link)
            .setURL(rolesUrl!)
            .setEmoji("↗️"),
        );
      }

      return ctx.reply({ embeds: [embed], components: [row as any] });
    }

    return ctx.reply({ embeds: [embed] });
  },
};
