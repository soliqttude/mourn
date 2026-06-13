import { EmbedBuilder } from "discord.js";
import type { Guild, User } from "discord.js";

export type ModAction = "banned" | "kicked" | "warned" | "softbanned" | "temporarily banned" | "muted" | "jailed";

const ACTION_COLOR: Record<ModAction, number> = {
  "banned":            0xED4245,
  "kicked":            0xFAA61A,
  "warned":            0xFAA61A,
  "softbanned":        0xED4245,
  "temporarily banned": 0xED4245,
  "muted":             0xFAA61A,
  "jailed":            0xFAA61A,
};

const ACTION_TITLE: Record<ModAction, string> = {
  "banned":            "Banned",
  "kicked":            "Kicked",
  "warned":            "Warned",
  "softbanned":        "Softbanned",
  "temporarily banned": "Temporarily Banned",
  "muted":             "Muted",
  "jailed":            "Jailed",
};

export interface ModDmOptions {
  action:    ModAction;
  guild:     Guild;
  moderator: User;
  reason:    string;
  extra?:    string;
}

export function buildModDmEmbed(opts: ModDmOptions): EmbedBuilder {
  const { action, guild, moderator, reason, extra } = opts;
  const isBan = action === "banned" || action === "softbanned" || action === "temporarily banned";

  const lines = [
    `**You have been ${action} in**`,
    guild.name,
    `**Moderator**`,
    moderator.username,
    `**Reason**`,
    reason,
  ];
  if (extra) lines.push("", extra);

  const footerParts: string[] = [];
  if (isBan) footerParts.push("If you would like to dispute this punishment, contact a staff member.");
  footerParts.push(new Date().toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));

  return new EmbedBuilder()
    .setColor(ACTION_COLOR[action])
    .setTitle(ACTION_TITLE[action])
    .setThumbnail(moderator.displayAvatarURL({ size: 256 }))
    .setDescription(lines.join("\n"))
    .setFooter({ text: footerParts.join(" | ") });
}
