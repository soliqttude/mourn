import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ApplicationCommandOptionType,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "setupinfo",
  description: "Post the 3 server info embeds (Role Info, Exclusive Roles, Boost Perks).",
  usage: "setupinfo [roles-url] [ticket-url]",
  examples: ["setupinfo", "setupinfo https://discord.gg/... https://discord.gg/..."],
  category: "settings",
  ownerOnly: true,
  options: [
    {
      name: "roles_url",
      description: "Link for the Roles button",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "ticket_url",
      description: "Link for the Ticket button",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("this command is not for you.")], ephemeral: true } as any);
    }
    if (!ctx.channel) return ctx.reply({ embeds: [errorEmbed("must be used in a channel.")] });

    const rolesUrl  = ctx.getString("roles_url")  ?? ctx.args[0] ?? "https://discord.gg/placeholder";
    const ticketUrl = ctx.getString("ticket_url") ?? ctx.args[1] ?? "https://discord.gg/placeholder";

    // ── Embed 1 — Role Info ───────────────────────────────────────────────────
    const roleInfo = new EmbedBuilder()
      .setColor(null as any)
      .setAuthor({ name: "👑  Role Info" })
      .setDescription(
        [
          "**Owner Roles**",
          "",
          "@founder  @owners",
          "",
          "**Staff Roles**",
          "",
          "@above  @manager  @admin  @mod  @trial mod",
          "",
          "to join our staff team check **#·mail** for applications",
          "",
          "**Helpers**",
          "",
          "@event manager  @pms  @uploader",
          "",
          "dm @moon for more info",
        ].join("\n"),
      )
      .setTimestamp()
      .setFooter({ text: config.embedFooter });

    // ── Embed 2 — Exclusive Roles ─────────────────────────────────────────────
    const exclusiveRoles = new EmbedBuilder()
      .setColor(null as any)
      .setAuthor({ name: "✅  Exclusive roles" })
      .setDescription(
        [
          "**famous** — @famous",
          "",
          "to obtain this role you must have",
          "",
          "<:tiktok:1> 20k+ on tiktok",
          "📷 20k+ on instagram",
          "",
          "**ogs** — @ogs",
          "",
          "this role isn't obtainable, was only given to certain people during the start of the server",
          "",
          "**donators** — @donators",
          "",
          "role is obtainable by donating to the server as in hosting giveaways",
          "",
          "**special** — @special",
          "",
          "this role is given to a certain amount of people",
          "",
          "**chrome** — @chrome  &  **hello kitty** — @hello kitty",
          "",
          "both are given to members that main our server and are @actives",
          "",
          "**goated** — @goated",
          "",
          "this role will only be obtainable for a limited time",
        ].join("\n"),
      )
      .setTimestamp()
      .setFooter({ text: config.embedFooter });

    // ── Embed 3 — Boost Perks ─────────────────────────────────────────────────
    const boostPerks = new EmbedBuilder()
      .setColor(null as any)
      .setAuthor({ name: "🛵  Boost Perks" })
      .setDescription(
        [
          "**@bank** role",
          "• instant pic perms + vc perms",
          "• custom role",
          "→",
          "",
          "`,br create (name)`",
          "`,br color (#hex), (example: ,br color #000000)`",
          "`,br icon (icon or emoji of your choice)`",
          "",
          "for more roles click the button below",
        ].join("\n"),
      )
      .setTimestamp()
      .setFooter({ text: config.embedFooter });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("roles")
        .setEmoji("↗️")
        .setStyle(ButtonStyle.Link)
        .setURL(rolesUrl),
      new ButtonBuilder()
        .setLabel("ticket")
        .setEmoji("↗️")
        .setStyle(ButtonStyle.Link)
        .setURL(ticketUrl),
    );

    // Delete invoking message if prefix command
    if (ctx.source === "prefix" && "delete" in ctx.raw) {
      (ctx.raw as any).delete().catch(() => {});
    }

    // Send all 3 embeds; last one gets the buttons
    await ctx.channel.send({ embeds: [roleInfo] });
    await ctx.channel.send({ embeds: [exclusiveRoles] });
    await ctx.channel.send({ embeds: [boostPerks], components: [row] });

    // Silent ack for slash
    if (ctx.source === "slash") {
      return ctx.reply({ content: "posted.", ephemeral: true } as any);
    }
  },
};
