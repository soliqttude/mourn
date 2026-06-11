import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { welcomeChannels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseScript } from "../../lib/scripting.js";

const VARIABLES = [
  "**— User —**",
  "`{user}` — display name",
  "`{user.mention}` — mention the user",
  "`{user.name}` — username",
  "`{user.id}` — user ID",
  "`{user.avatar}` — avatar URL",
  "`{user.tag}` — user#0000",
  "`{user.created_at}` — account creation (relative)",
  "`{member.joined_at}` — join date (relative)",
  "`{member.nickname}` — nickname or username",
  "",
  "**— Server —**",
  "`{guild.name}` — server name",
  "`{guild.member_count}` — member count",
  "`{guild.icon}` — server icon URL",
  "`{guild.boost_count}` — boost count",
  "`{guild.boost_level}` — boost tier",
  "`{guild.owner}` — owner mention",
  "",
  "**— Misc —**",
  "`{inviter}` — who invited them",
  "`{invite_code}` — invite code used",
  "`{timestamp}` — current date/time",
  "`{newline}` or `{nl}` — line break",
  "",
  "**— Embed Scripting —**",
  "Start with `{embed}`, then chain props using `$v{key: value}`",
  "`$v{title: text}` — embed title",
  "`$v{description: text}` — body (`/e` = newline inside)",
  "`$v{color: red}` — sidebar color (named or #hex)",
  "`$v{thumbnail: {user.avatar}}` — thumbnail",
  "`$v{image: url}` — large image",
  "`$v{footer: text && icon_url}` — footer",
  "`$v{author: name && icon_url}` — author line",
  "`$v{field: Title && Value && inline}` — field",
  "`$v{timestamp: now}` — timestamp",
  "`$v{button: Label && https://url}` — link button",
  "",
  "**— Example —**",
  "```",
  "hi {user.mention}",
  "{embed}$v{title: welcome to {guild.name}}$v{description: check the rules /e have fun!}$v{thumbnail: {user.avatar}}$v{footer: {guild.member_count} members}$v{color: invisible}$v{timestamp: now}",
  "```",
].join("\n");

export const command: HybridCommand = {
  name: "welcome",
  aliases: ["setwelcome"],
  description: "Manage welcome messages with full embed scripting support.",
  usage: "welcome <add|remove|list|view|variables> [channel] [message]",
  examples: [
    "welcome add #welcome hi {user.mention} {embed}$v{title: welcome to {guild.name}}$v{thumbnail: {user.avatar}}$v{footer: {guild.member_count} members}$v{timestamp: now}",
    "welcome remove #welcome",
    "welcome list",
    "welcome view #welcome",
    "welcome variables",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    {
      name: "subcommand",
      description: "add | remove | list | view | variables",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
        { name: "view", value: "view" },
        { name: "variables", value: "variables" },
      ],
    },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Welcome message (supports embed scripting)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "variables") {
      return ctx.reply({
        embeds: [brandEmbed({ title: "Welcome Variables & Embed Scripting", description: VARIABLES })],
      });
    }

    if (sub === "list") {
      const rows = await db.select().from(welcomeChannels).where(eq(welcomeChannels.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No welcome **channels** set up.")] });
      return ctx.reply({
        embeds: [brandEmbed({ title: "Welcome Channels", description: rows.map((r) => `<#${r.channelId}>`).join("\n") })],
      });
    }

    const ch =
      (ctx.getChannel("channel") as any) ??
      ctx.guild.channels.cache.get(ctx.args[1]?.replace(/[<#>]/g, "") ?? "");

    if (!ch && sub !== "list" && sub !== "variables") {
      return ctx.reply({ embeds: [errorEmbed("Please provide a **channel**.")] });
    }

    if (sub === "view") {
      const [row] = await db
        .select()
        .from(welcomeChannels)
        .where(and(eq(welcomeChannels.guildId, ctx.guild.id), eq(welcomeChannels.channelId, ch.id)));
      if (!row) return ctx.reply({ embeds: [errorEmbed("No welcome message for that **channel**.")] });
      return ctx.reply({
        embeds: [brandEmbed({ title: `Welcome — #${ch.name}`, description: `\`\`\`\n${row.message}\n\`\`\`` })],
      });
    }

    if (sub === "remove") {
      await db
        .delete(welcomeChannels)
        .where(and(eq(welcomeChannels.guildId, ctx.guild.id), eq(welcomeChannels.channelId, ch.id)));
      return ctx.reply({ embeds: [successEmbed(`welcome message removed from <#${ch.id}>.`)] });
    }

    if (sub === "add") {
      const msg = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!msg) {
        return ctx.reply({
          embeds: [errorEmbed("Please provide a welcome message. run `welcome variables` to see the embed scripting syntax.")],
        });
      }

      await db
        .insert(welcomeChannels)
        .values({ guildId: ctx.guild.id, channelId: ch.id, message: msg })
        .onConflictDoUpdate({
          target: [welcomeChannels.guildId, welcomeChannels.channelId],
          set: { message: msg },
        });

      // ── Live preview rendered against the command author ──────────────────
      const member = ctx.guild.members.cache.get(ctx.author?.id ?? "") ?? null;
      const { embeds: previewEmbeds, content: previewContent, components } = parseScript(msg, {
        user: member ?? ctx.author,
        guild: ctx.guild,
        channel: ch,
        client: ctx.client,
      });

      const confirmEmbed = successEmbed(`welcome message set for <#${ch.id}>. here's a preview:`);

      if (previewEmbeds.length) {
        return ctx.reply({
          embeds: [confirmEmbed, ...previewEmbeds],
          components: components.length ? components : undefined,
        });
      }

      return ctx.reply({
        content: previewContent ?? undefined,
        embeds: [confirmEmbed],
      });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand.")] });
  },
};
