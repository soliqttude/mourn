import { EmbedBuilder, type Guild, type User } from "discord.js";
import { config } from "../config.js";

interface EmbedOpts {
  title?: string;
  description?: string;
  page?: string;
  guild?: Guild | null;
  user?: User | null;
  thumbnail?: string;
  image?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

export function brandEmbed(opts: EmbedOpts = {}): EmbedBuilder {
  const eb = new EmbedBuilder().setColor(config.brandColor);
  if (opts.title) eb.setTitle(opts.title);
  if (opts.description) eb.setDescription(opts.description);
  if (opts.fields?.length) eb.addFields(opts.fields);
  if (opts.thumbnail) eb.setThumbnail(opts.thumbnail);
  if (opts.image) eb.setImage(opts.image);

  const footer = opts.page ? `${config.embedFooter} · ${opts.page}` : config.embedFooter;
  eb.setFooter({ text: footer });
  eb.setTimestamp(new Date());

  if (opts.guild) {
    eb.setAuthor({
      name: opts.guild.name,
      iconURL: opts.guild.iconURL() ?? undefined,
    });
  } else if (opts.user) {
    eb.setAuthor({
      name: opts.user.username,
      iconURL: opts.user.displayAvatarURL(),
    });
  }
  return eb;
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x1e3322)
    .setDescription(message)
    .setFooter({ text: config.embedFooter })
    .setTimestamp(new Date());
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x3d1a1a)
    .setDescription(message)
    .setFooter({ text: config.embedFooter });
}

export function infoEmbed(message: string, title?: string): EmbedBuilder {
  const eb = new EmbedBuilder()
    .setColor(config.brandColor)
    .setDescription(message)
    .setFooter({ text: config.embedFooter })
    .setTimestamp(new Date());
  if (title) eb.setTitle(title);
  return eb;
}

interface ModEmbedOpts {
  action: string;
  target: User;
  moderator: User;
  reason: string;
  caseId?: number;
  duration?: string;
}

export function modEmbed(opts: ModEmbedOpts): EmbedBuilder {
  const lines: string[] = [
    `**reason** — ${opts.reason}`,
  ];
  if (opts.duration) lines.push(`**duration** — ${opts.duration}`);
  if (opts.caseId) lines.push(`**case** — #${opts.caseId}`);

  return new EmbedBuilder()
    .setColor(0x1a0a0a)
    .setAuthor({
      name: `${opts.action} · ${opts.target.username}`,
      iconURL: opts.target.displayAvatarURL(),
    })
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `${config.embedFooter} · ${opts.moderator.username}`,
      iconURL: opts.moderator.displayAvatarURL(),
    })
    .setTimestamp(new Date());
}
