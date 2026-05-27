import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Guild,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";

const COLOR = 0x2b2d31;
const OWNER_ID = "1492017858182385684";

// Custom emoji IDs
const E = {
  roleInfo:       "1509210164501283037", // IMG_9884 — crown
  exclusiveRoles: "1509210329882820850", // IMG_9886
  friendGroups:   "1509210163272486922", // IMG_9885
  boostPerks:     "1509210165893660863", // IMG_9883
  tiktok:         "1509211073025146951",
  instagram:      "1509211074648604692",
};

function emoji(id: string, g: Guild, fallback = ""): string {
  return g.emojis.cache.get(id)?.toString() ?? fallback;
}

function role(name: string, g: Guild): string {
  const found = g.roles.cache.find(
    (r) => r.name.toLowerCase() === name.toLowerCase()
  );
  return found ? `<@&${found.id}>` : `**@${name}**`;
}

function ch(name: string, g: Guild): string {
  const found = g.channels.cache.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return found ? `<#${found.id}>` : `**#${name}**`;
}

function chLink(name: string, g: Guild): string {
  const found = g.channels.cache.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return found
    ? `https://discord.com/channels/${g.id}/${found.id}`
    : "https://discord.gg/CdUtYSFC3U";
}

export const command: HybridCommand = {
  name: "setinfo",
  aliases: ["postinfo"],
  description: "Post the server info embeds in this channel.",
  category: "owner",
  permission: "admin",
  guildOnly: true,
  noSlash: true,
  usage: "setinfo",
  examples: ["setinfo"],
  options: [],

  async execute(ctx) {
    if (!ctx.guild) return;
    const g = ctx.guild;

    const eRoleInfo       = emoji(E.roleInfo, g, "👑");
    const eExclusive      = emoji(E.exclusiveRoles, g, "✅");
    const eFriendGroups   = emoji(E.friendGroups, g, "👥");
    const eBoostPerks     = emoji(E.boostPerks, g, "🎯");
    const eTiktok         = emoji(E.tiktok, g, "🎵");
    const eInstagram      = emoji(E.instagram, g, "📸");

    // ── Embed 1: Role Info ───────────────────────────────────────────────────
    const roleInfoEmbed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${eRoleInfo} Role Info`)
      .setDescription(
        [
          "**Owner Roles**",
          `${role("founder", g)} ${role("own", g)}`,
          "",
          "**Staff Roles**",
          `${role("above", g)} ${role("manager", g)} ${role("admin", g)} ${role("mod", g)} ${role("trial mod", g)}`,
          "",
          `to join our staff team check ${ch("mail", g)} for applications`,
          "",
          "**Helpers**",
          `${role("event manager", g)} ${role("pms", g)} ${role("uploader", g)}`,
          "",
          `dm <@${OWNER_ID}> for more info`,
        ].join("\n")
      );

    // ── Embed 2: Exclusive Roles ─────────────────────────────────────────────
    const exclusiveEmbed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${eExclusive} Exclusive Roles`)
      .setDescription(
        [
          `**famous** - ${role("famous", g)}`,
          "to obtain this role you must have",
          `${eTiktok} 1k+ on tiktok`,
          `${eInstagram} 1k+ on instagram`,
          "",
          `**ogs** - ${role("ogs", g)}`,
          "this role isn't obtainable, was only given to certain people during the start of the server",
          "",
          `**donators** - ${role("donators", g)}`,
          "role is obtainable by donating to the server as in hosting giveaways",
          "",
          `**special** - ${role("special", g)}`,
          "this role is given to a certain amount of people",
          "",
          `**chrome** - ${role("chrome", g)} & **hello kitty** - ${role("hello kitty", g)}`,
          `both are given to members that main our server and are ${role("actives", g)}`,
          "",
          `**goated** - ${role("goated", g)}`,
          "this role will only be obtainable for a limited amount of time. type tiktok in chat for more details.",
        ].join("\n")
      );

    // ── Embed 3: Friend Groups ───────────────────────────────────────────────
    const friendGroupsEmbed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${eFriendGroups} Friend Groups`)
      .setDescription(
        [
          "**Requirements**",
          "",
          "∙ must be active",
          "∙ in total of 4+ members",
          "∙ must rep /depend",
          "",
          "**Benefits**",
          "",
          "∙ custom group role",
          `∙ chance at high roles (if active) make a ticket in ${ch("help", g)} for more info`,
        ].join("\n")
      );

    // ── Embed 4: Boost Perks ─────────────────────────────────────────────────
    const boostEmbed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${eBoostPerks} Boost Perks`)
      .setDescription(
        [
          `${role("bank", g)} role`,
          "∙ instant pic perms + vc perms",
          "∙ custom role",
          "→",
          "`,br create (name)`",
          "`,br color (#hex)` (example: `,br color #000000`)",
          "`,br icon (icon or emoji of your choice)`",
        ].join("\n")
      );

    // ── Buttons ──────────────────────────────────────────────────────────────
    const rolesUrl  = chLink("roles", g);
    const ticketUrl = chLink("ticket", g) !== "https://discord.gg/CdUtYSFC3U"
      ? chLink("ticket", g)
      : chLink("tickets", g);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("roles").setStyle(ButtonStyle.Link).setURL(rolesUrl),
      new ButtonBuilder().setLabel("ticket").setStyle(ButtonStyle.Link).setURL(ticketUrl)
    );

    // ── Send ─────────────────────────────────────────────────────────────────
    try {
      await ctx.channel?.send({ embeds: [roleInfoEmbed] });
      await ctx.channel?.send({ embeds: [exclusiveEmbed] });
      await ctx.channel?.send({ embeds: [friendGroupsEmbed] });
      await ctx.channel?.send({ embeds: [boostEmbed] });
      await ctx.channel?.send({
        content: "for more roles click the button below",
        components: [row],
      });

      if (ctx.source === "prefix") {
        try {
          await (ctx.raw as import("discord.js").Message).delete();
        } catch { /* ignore */ }
      }
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
