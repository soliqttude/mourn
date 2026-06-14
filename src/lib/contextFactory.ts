import {
  type ChatInputCommandInteraction,
  type Client,
  type Message,
  type GuildMember,
  type GuildTextBasedChannel,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { CommandContext, ReplyContent } from "./command.js";
import {
  resolveChannel,
  resolveMember,
  resolveRole,
  resolveUser,
} from "./parsing.js";
import { getEmbedStyle, EMOJIS } from "./embeds.js";

// ── Inject "emoji @user: " prefix into styled embeds ──────────────────────────
function injectMention(embeds: unknown[], userMention: string): unknown[] {
  if (!embeds?.length) return embeds;
  return embeds.map((eb) => {
    if (!(eb instanceof EmbedBuilder)) return eb;
    const style = getEmbedStyle(eb);
    if (!style || style === "brand" || style === "mod") return eb;
    const desc = (eb.data as any).description ?? "";
    const emoji =
      style === "success" ? EMOJIS.check :
      style === "error"   ? EMOJIS.warn  :
      style === "warn"    ? EMOJIS.warn  :
      style === "action"  ? EMOJIS.plus  : "";
    eb.setDescription(`${emoji} ${userMention}: ${desc}`);
    return eb;
  });
}

function normalize(content: ReplyContent, userMention?: string): any {
  if (typeof content === "string") return { content };
  const out: any = { ...content };
  if (out.ephemeral) {
    out.flags = MessageFlags.Ephemeral;
    delete out.ephemeral;
  }
  if (out.embeds && userMention) {
    out.embeds = injectMention(out.embeds, userMention);
  }
  return out;
}

export async function buildSlashContext(
  client: Client,
  interaction: ChatInputCommandInteraction,
  prefix: string
): Promise<CommandContext> {
  const opts = interaction.options;
  const mention = `<@${interaction.user.id}>`;
  return {
    client,
    guild: interaction.guild,
    member: (interaction.member as GuildMember) ?? null,
    user: interaction.user,
    channel: (interaction.channel as GuildTextBasedChannel) ?? null,
    source: "slash",
    raw: interaction,
    args: [],
    rawArgs: "",
    prefix,
    getString: (n, r) => opts.getString(n, r ?? false),
    getNumber: (n, r) => {
      try {
        return opts.getNumber(n, r ?? false) ?? opts.getInteger(n, r ?? false) ?? null;
      } catch {
        try {
          return opts.getInteger(n, r ?? false) ?? null;
        } catch {
          return null;
        }
      }
    },
    getBoolean: (n, r) => opts.getBoolean(n, r ?? false),
    getUser: async (n, r) => opts.getUser(n, r ?? false),
    getMember: async (n) => (opts.getMember(n) as GuildMember) ?? null,
    getChannel: (n) => (opts.getChannel(n) as GuildTextBasedChannel) ?? null,
    getRole: (n) => opts.getRole(n) ?? null,
    reply: async (c) => {
      const payload = normalize(c, mention);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(payload);
      }
      return interaction.reply(payload);
    },
    followUp: async (c) => interaction.followUp(normalize(c, mention)),
    defer: async (eph) =>
      interaction.deferReply(
        eph ? ({ flags: MessageFlags.Ephemeral } as any) : ({} as any)
      ),
  };
}

export async function buildPrefixContext(
  client: Client,
  message: Message,
  args: string[],
  rawArgs: string,
  prefix: string,
  optionDefs: { name: string; type: number }[]
): Promise<CommandContext> {
  const argMap = mapArgs(optionDefs, args);
  const mention = `<@${message.author.id}>`;
  return {
    client,
    guild: message.guild,
    member: message.member,
    user: message.author,
    channel: message.channel as GuildTextBasedChannel,
    source: "prefix",
    raw: message,
    args,
    rawArgs,
    prefix,
    getString: (n, _r) => {
      const v = argMap[n];
      return v ?? null;
    },
    getNumber: (n, _r) => {
      const v = argMap[n];
      const num = v ? Number(v) : NaN;
      return Number.isFinite(num) ? num : null;
    },
    getBoolean: (n) => {
      const v = argMap[n];
      if (!v) return null;
      return ["true", "yes", "on", "1", "enable"].includes(v.toLowerCase());
    },
    getUser: async (n, _r) => {
      const v = argMap[n];
      if (!v) return null;
      return resolveUser(client, v);
    },
    getMember: async (n, _r) => {
      const v = argMap[n];
      if (!v || !message.guild) return null;
      return resolveMember(message.guild, v);
    },
    getChannel: (n) => {
      const v = argMap[n];
      if (!v || !message.guild) return null;
      return resolveChannel(message.guild, v);
    },
    getRole: (n) => {
      const v = argMap[n];
      if (!v || !message.guild) return null;
      return resolveRole(message.guild, v);
    },
    reply: async (c) => {
      const payload = normalize(c, mention);
      delete payload.flags;
      return message.reply({
        ...payload,
        allowedMentions: payload.allowedMentions ?? { parse: [] },
      });
    },
    followUp: async (c) => {
      const payload = normalize(c, mention);
      delete payload.flags;
      return (message.channel as GuildTextBasedChannel).send(payload);
    },
    defer: async () => {
      try {
        await (message.channel as any).sendTyping?.();
      } catch {
        /* ignore */
      }
    },
  };
}

function mapArgs(
  defs: { name: string; type: number }[],
  args: string[]
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (defs.length === 0) return out;
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (i === defs.length - 1 && def.type === 3) {
      out[def.name] = args.slice(i).join(" ") || undefined;
    } else {
      out[def.name] = args[i];
    }
  }
  return out;
}
