import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { socialSubscriptions } from "../db/schema.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";

async function fetchYouTube(channelId: string): Promise<{ id: string; title: string; url: string; thumbnail: string } | null> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const xml = await res.text();
    const idMatch = xml.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = xml.match(/<title>(.*?)<\/title>/g);
    if (!idMatch) return null;
    const videoId = idMatch[1];
    const title = titleMatch?.[1]?.replace(/<\/?title>/g, "") ?? "Unknown";
    return { id: videoId, title, url: `https://youtube.com/watch?v=${videoId}`, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
  } catch { return null; }
}

async function fetchTwitch(username: string): Promise<{ id: string; title: string; url: string; game: string } | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, { method: "POST", signal: AbortSignal.timeout(8000) });
    const { access_token } = await tokenRes.json() as any;
    const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
      headers: { "Client-ID": clientId, Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(8000),
    });
    const data = await streamRes.json() as any;
    const stream = data.data?.[0];
    if (!stream) return null;
    return { id: stream.id, title: stream.title, url: `https://twitch.tv/${username}`, game: stream.game_name };
  } catch { return null; }
}

async function fetchReddit(subreddit: string): Promise<{ id: string; title: string; url: string; author: string } | null> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/new.json?limit=1`, {
      headers: { "User-Agent": "bestmourn-bot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const post = data.data?.children?.[0]?.data;
    if (!post) return null;
    return { id: post.id, title: post.title, url: `https://reddit.com${post.permalink}`, author: post.author };
  } catch { return null; }
}

async function checkSubscription(client: Client, sub: typeof socialSubscriptions.$inferSelect): Promise<void> {
  let post: { id: string; title: string; url: string; [k: string]: string } | null = null;

  if (sub.platform === "youtube") post = await fetchYouTube(sub.target);
  else if (sub.platform === "twitch") post = await fetchTwitch(sub.target);
  else if (sub.platform === "reddit") post = await fetchReddit(sub.target);

  if (!post || post.id === sub.lastPostId) return;

  await db.update(socialSubscriptions).set({ lastPostId: post.id }).where(eq(socialSubscriptions.id, sub.id));

  const ch = client.channels.cache.get(sub.channelId) as TextChannel | undefined;
  if (!ch) return;

  const content = sub.message ?? (sub.platform === "twitch" ? `🔴 **${sub.target}** is now live!` : `📢 New post from **${sub.target}**`);

  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle(post.title)
    .setURL(post.url)
    .setFooter({ text: sub.platform });

  if (post.thumbnail) embed.setImage(post.thumbnail);
  if (post.game) embed.addFields({ name: "Game", value: post.game, inline: true });
  if (post.author) embed.addFields({ name: "Posted by", value: `u/${post.author}`, inline: true });

  await ch.send({ content, embeds: [embed] }).catch(() => {});
}

export function startSocialNotificationLoop(client: Client): void {
  setInterval(async () => {
    try {
      const subs = await db.select().from(socialSubscriptions);
      for (const sub of subs) {
        await checkSubscription(client, sub).catch(() => {});
      }
    } catch (err) {
      logger.warn({ err }, "social notifications loop error");
    }
  }, 5 * 60 * 1000);
}
