import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand, CommandContext } from "./command.js";
import { db } from "../db/index.js";
import { socialSubscriptions } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../config.js";
import { successEmbed, errorEmbed, brandEmbed } from "./embeds.js";

export const SOCIAL_PLATFORMS = ["tiktok","instagram","youtube","twitter","reddit","soundcloud","pinterest","twitch","kick"] as const;
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number];
type SocialConfig = { message?: string; pingable?: boolean; retweets?: boolean; embeds?: boolean };

export function encodeSocialMessage(cfg: SocialConfig): string | null {
  if (!cfg.message && cfg.pingable === undefined && cfg.retweets === undefined && cfg.embeds === undefined) return null;
  return JSON.stringify(cfg);
}
export function decodeSocialMessage(raw: string | null): SocialConfig {
  if (!raw) return {};
  try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === "object") return parsed as SocialConfig; } catch {}
  return { message: raw };
}
function arg(ctx: CommandContext, name: string, index: number) { return ctx.getString(name) ?? ctx.args[index] ?? ""; }

export function makeSocialCommand(platform: SocialPlatform): HybridCommand {
  return {
    name: platform,
    description: `Manage ${platform} social feeds and notification messages.`,
    category: "social",
    permission: "none",
    guildOnly: true,
    usage: `${platform} [add|remove|message|message view|list]`,
    examples: [`${platform} add #channel username`,`${platform} remove #channel username`,`${platform} message username New post: {title}`,`${platform} list`],
    options: [
      { name:"subcommand", description:"add | remove | message | message-view | list", type:ApplicationCommandOptionType.String, required:false },
      { name:"channel", description:"Discord channel", type:ApplicationCommandOptionType.Channel, required:false },
      { name:"target", description:"username / channel URL / subreddit", type:ApplicationCommandOptionType.String, required:false },
      { name:"message", description:"notification message", type:ApplicationCommandOptionType.String, required:false },
      { name:"pingable", description:"on or off", type:ApplicationCommandOptionType.String, required:false },
      { name:"setting", description:"yes or no", type:ApplicationCommandOptionType.String, required:false },
    ],
    async execute(ctx) {
      if (!ctx.guild) return;
      if (!config.databaseEnabled) return ctx.reply({embeds:[errorEmbed(`${platform} notifications require the database to be enabled. Add DATABASE_URL to Render.`)]});
      const sub=arg(ctx,"subcommand",0).toLowerCase();
      const guildId=ctx.guild.id;
      if (sub==="list" || !sub) {
        const rows=await db.select().from(socialSubscriptions).where(eq(socialSubscriptions.guildId,guildId));
        const mine=rows.filter(r=>r.platform===platform);
        if (!mine.length) return ctx.reply({embeds:[errorEmbed(`No ${platform} feeds are configured.`)]});
        return ctx.reply({embeds:[brandEmbed({title:`${platform} feeds`,description:mine.map((r,i)=>`**#${i+1}** <#${r.channelId}> — \`${r.target}\``).join("\n")})]});
      }
      if (sub==="add") {
        const ch=ctx.getChannel("channel") ?? (ctx.args[1] ? ctx.guild.channels.cache.get(ctx.args[1].replace(/[<#>]/g,"")) : null);
        const target=ctx.getString("target") ?? ctx.args[2] ?? "";
        if (!ch) return ctx.reply({embeds:[errorEmbed("Provide a Discord channel.")]});
        if (!target) return ctx.reply({embeds:[errorEmbed("Provide the account, channel URL, or subreddit.")]});
        const existing=await db.select().from(socialSubscriptions).where(and(eq(socialSubscriptions.guildId,guildId),eq(socialSubscriptions.platform,platform),eq(socialSubscriptions.target,target)));
        if (existing.length) return ctx.reply({embeds:[errorEmbed(`That ${platform} feed already exists.`)]});
        await db.insert(socialSubscriptions).values({guildId,channelId:ch.id,platform,target});
        return ctx.reply({embeds:[successEmbed(`${platform} feed added: <#${ch.id}> → \`${target}\`.`)]});
      }
      if (sub==="remove") {
        const target=ctx.getString("target") ?? ctx.args[2] ?? "";
        if (!target) return ctx.reply({embeds:[errorEmbed("Provide the account or feed target.")]});
        const rows=await db.select().from(socialSubscriptions).where(and(eq(socialSubscriptions.guildId,guildId),eq(socialSubscriptions.platform,platform),eq(socialSubscriptions.target,target)));
        if (!rows.length) return ctx.reply({embeds:[errorEmbed("Feed not found.")]});
        await db.delete(socialSubscriptions).where(eq(socialSubscriptions.id,rows[0]!.id));
        return ctx.reply({embeds:[successEmbed(`${platform} feed removed.`)]});
      }
      if (sub==="message" || sub==="message-view") {
        const target=ctx.getString("target") ?? ctx.args[2] ?? "";
        if (!target) return ctx.reply({embeds:[errorEmbed("Provide the account or feed target.")]});
        const rows=await db.select().from(socialSubscriptions).where(and(eq(socialSubscriptions.guildId,guildId),eq(socialSubscriptions.platform,platform),eq(socialSubscriptions.target,target)));
        if (!rows.length) return ctx.reply({embeds:[errorEmbed("Feed not found.")]});
        const row=rows[0]!, current=decodeSocialMessage(row.message);
        if (sub==="message-view") return ctx.reply({embeds:[brandEmbed({title:`${platform} notification message`,description:current.message ?? "default"})]});
        const message=ctx.getString("message") ?? ctx.args.slice(3).join(" ");
        if (!message) return ctx.reply({embeds:[errorEmbed("Provide a message.")]});
        const pingRaw=ctx.getString("pingable");
        const pingable=pingRaw ? ["on","true","yes","1"].includes(pingRaw.toLowerCase()) : current.pingable;
        await db.update(socialSubscriptions).set({message:encodeSocialMessage({message,pingable})}).where(eq(socialSubscriptions.id,row.id));
        return ctx.reply({embeds:[successEmbed(`${platform} notification message updated.`)]});
      }
      if (sub==="retweets" || sub==="embeds") {
        const target=ctx.getString("target") ?? ctx.args[2] ?? "";
        const setting=ctx.getString("setting") ?? ctx.args[3] ?? "";
        if (!target || !["yes","no","on","off","true","false"].includes(setting.toLowerCase())) return ctx.reply({embeds:[errorEmbed("Provide the target and a yes/no setting.")]});
        const rows=await db.select().from(socialSubscriptions).where(and(eq(socialSubscriptions.guildId,guildId),eq(socialSubscriptions.platform,platform),eq(socialSubscriptions.target,target)));
        if (!rows.length) return ctx.reply({embeds:[errorEmbed("Feed not found.")]});
        const current=decodeSocialMessage(rows[0]!.message), enabled=["yes","on","true"].includes(setting.toLowerCase());
        await db.update(socialSubscriptions).set({message:encodeSocialMessage({...current,[sub]:enabled})}).where(eq(socialSubscriptions.id,rows[0]!.id));
        return ctx.reply({embeds:[successEmbed(`${platform} ${sub} set to **${enabled ? "on" : "off"}**.`)]});
      }
      return ctx.reply({embeds:[errorEmbed(`Usage: ,${platform} add|remove|message|list`)]});
    },
  };
}
