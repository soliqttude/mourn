import { EmbedBuilder, ApplicationCommandOptionType, Message } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";

const LANG_NAMES: Record<string, string> = {
  af:"Afrikaans",sq:"Albanian",am:"Amharic",ar:"Arabic",hy:"Armenian",az:"Azerbaijani",
  eu:"Basque",be:"Belarusian",bn:"Bengali",bs:"Bosnian",bg:"Bulgarian",ca:"Catalan",
  ceb:"Cebuano","zh-CN":"Chinese Simplified","zh-TW":"Chinese Traditional",co:"Corsican",
  hr:"Croatian",cs:"Czech",da:"Danish",nl:"Dutch",en:"English",eo:"Esperanto",et:"Estonian",
  fil:"Filipino",fi:"Finnish",fr:"French",fy:"Frisian",gl:"Galician",ka:"Georgian",de:"German",
  el:"Greek",gu:"Gujarati",ht:"Haitian Creole",ha:"Hausa",haw:"Hawaiian",iw:"Hebrew",
  hi:"Hindi",hmn:"Hmong",hu:"Hungarian",is:"Icelandic",ig:"Igbo",id:"Indonesian",ga:"Irish",
  it:"Italian",ja:"Japanese",jw:"Javanese",kn:"Kannada",kk:"Kazakh",km:"Khmer",ko:"Korean",
  ku:"Kurdish",ky:"Kyrgyz",lo:"Lao",la:"Latin",lv:"Latvian",lt:"Lithuanian",lb:"Luxembourgish",
  mk:"Macedonian",mg:"Malagasy",ms:"Malay",ml:"Malayalam",mt:"Maltese",mi:"Maori",mr:"Marathi",
  mn:"Mongolian",my:"Myanmar Burmese",ne:"Nepali",no:"Norwegian",ny:"Nyanja Chichewa",
  ps:"Pashto",fa:"Persian",pl:"Polish","pt-BR":"Portuguese (Brazil)","pt-PT":"Portuguese (Portugal)",
  pa:"Punjabi",ro:"Romanian",ru:"Russian",sm:"Samoan",gd:"Scots Gaelic",sr:"Serbian",
  st:"Sesotho",sn:"Shona",sd:"Sindhi",si:"Sinhala",sk:"Slovak",sl:"Slovenian",so:"Somali",
  es:"Spanish",su:"Sundanese",sw:"Swahili",sv:"Swedish",tl:"Tagalog",tg:"Tajik",ta:"Tamil",
  te:"Telugu",th:"Thai",tr:"Turkish",uk:"Ukrainian",ur:"Urdu",uz:"Uzbek",vi:"Vietnamese",
  cy:"Welsh",xh:"Xhosa",yi:"Yiddish",yo:"Yoruba",zu:"Zulu",
};

function langName(code: string): string {
  return LANG_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

export const command: HybridCommand = {
  name: "translate",
  description: "Translate text or a replied message to another language.",
  usage: "translate [to] [text] — or reply to a message with ,tr [to]",
  examples: ["tr", "tr fr", "tr fr en Hello world"],
  category: "utility",
  aliases: ["tr", "trans"],
  options: [
    { name: "to",   description: "Target language code (default: en)", type: ApplicationCommandOptionType.String, required: false },
    { name: "from", description: "Source language code (default: auto)", type: ApplicationCommandOptionType.String, required: false },
    { name: "text", description: "Text to translate (or reply to a message)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    // --- resolve text & languages ---
    let text: string | null = null;
    let to   = "en";
    let from = "auto";
    let replyAuthor: { name: string; iconURL?: string } | null = null;

    if (ctx.source === "prefix") {
      const raw = ctx.raw as Message;

      // grab text from replied message first
      if (raw.reference?.messageId) {
        const ref = await (ctx.channel as any).messages
          .fetch(raw.reference.messageId)
          .catch(() => null) as Message | null;
        if (ref?.content) {
          text = ref.content;
          replyAuthor = {
            name:    ref.author.tag,
            iconURL: ref.author.displayAvatarURL(),
          };
        }
      }

      // args: [to] [from] [text...] — or just [text...] if first arg isn't a lang code
      const args = ctx.args;
      if (args.length > 0) {
        const first  = args[0].toLowerCase();
        const second = args[1]?.toLowerCase();
        const isLang = (s: string) => /^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/.test(s);

        if (isLang(first) && args.length >= 2 && isLang(second)) {
          // ,tr fr en some text
          to   = first;
          from = second;
          if (!text) text = args.slice(2).join(" ") || null;
        } else if (isLang(first) && args.length === 1) {
          // ,tr fr  (with replied message)
          to = first;
        } else if (isLang(first) && args.length > 1) {
          // ,tr fr some text
          to = first;
          if (!text) text = args.slice(1).join(" ") || null;
        } else {
          // ,tr some plain text
          if (!text) text = args.join(" ") || null;
        }
      }
    } else {
      to   = ctx.getString("to")   ?? "en";
      from = ctx.getString("from") ?? "auto";
      text = ctx.getString("text") ?? null;
    }

    if (!text) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("Reply to a message or provide text to translate.")] });
    }

    // --- call Google Translate free endpoint ---
    let translated: string;
    let detectedFrom: string = from;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
      const res  = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as any;
      translated  = (data[0] as any[][]).map((seg: any[]) => seg[0]).join("").trim();
      if (data[2] && from === "auto") detectedFrom = data[2] as string;
      if (!translated) throw new Error("Empty response");
    } catch (e) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`Translation failed: ${(e as Error).message}`)] });
    }

    const fromName = langName(detectedFrom);
    const toName   = langName(to);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Translated from ${fromName} to ${toName}`)
      .setDescription(translated.slice(0, 2000))
      .setFooter({ text: "Google Translate" })
      .setTimestamp();

    if (replyAuthor) {
      embed.setAuthor({ name: replyAuthor.name, iconURL: replyAuthor.iconURL });
    }

    return ctx.reply({ embeds: [embed] });
  },
};
