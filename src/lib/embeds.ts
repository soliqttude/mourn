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

  const footer = opts.page ? `${config.embedFooter} • ${opts.page}` : config.embedFooter;
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

export function successEmbed(message: string, title = "Success"): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.successColor)
    .setDescription(`✅ ${message}`)
    .setFooter({ text: config.embedFooter })
    .setTimestamp(new Date())
    .setTitle(title);
}

export function errorEmbed(message: string, title = "Error"): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.errorColor)
    .setDescription(`❌ ${message}`)
    .setFooter({ text: config.embedFooter })
    .setTimestamp(new Date())
    .setTitle(title);
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
