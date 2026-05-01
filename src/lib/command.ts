import {
  type ApplicationCommandOptionData,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type Message,
  type MessageReplyOptions,
  type InteractionReplyOptions,
  type User,
  type GuildTextBasedChannel,
  EmbedBuilder,
  type AttachmentBuilder,
} from "discord.js";
import type { PermTier } from "./permissions.js";

export interface HybridCommand {
  name: string;
  description: string;
  category: string;
  permission?: PermTier;
  aliases?: string[];
  guildOnly?: boolean;
  ownerOnly?: boolean;
  options?: ApplicationCommandOptionData[];
  usage?: string;
  examples?: string[];
  execute: (ctx: CommandContext) => Promise<unknown>;
}

export interface CommandContext {
  client: Client;
  guild: Guild | null;
  member: GuildMember | null;
  user: User;
  channel: GuildTextBasedChannel | null;
  source: "slash" | "prefix";
  raw: ChatInputCommandInteraction | Message;
  args: string[];
  rawArgs: string;
  prefix: string;

  getString: (name: string, required?: boolean) => string | null;
  getUser: (name: string, required?: boolean) => Promise<User | null>;
  getMember: (name: string, required?: boolean) => Promise<GuildMember | null>;
  getNumber: (name: string, required?: boolean) => number | null;
  getBoolean: (name: string, required?: boolean) => boolean | null;
  getChannel: (name: string, required?: boolean) => GuildTextBasedChannel | null;
  getRole: (name: string, required?: boolean) => any;

  reply: (content: ReplyContent) => Promise<unknown>;
  followUp: (content: ReplyContent) => Promise<unknown>;
  defer: (ephemeral?: boolean) => Promise<unknown>;
}

export type ReplyContent =
  | string
  | {
      content?: string;
      embeds?: EmbedBuilder[];
      ephemeral?: boolean;
      components?: any[];
      files?: AttachmentBuilder[];
      allowedMentions?: { parse?: ("users" | "roles" | "everyone")[] };
    };
