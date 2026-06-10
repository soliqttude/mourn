const NEKOS_BEST = new Set([
  "bite","blush","bored","cry","cuddle","dance","facepalm","feed",
  "happy","highfive","hug","kiss","laugh","pat","poke","pout",
  "punch","shoot","shrug","slap","sleep","smile","smug","stare",
  "think","thumbsup","tickle","wave","wink","yawn","yeet",
]);

const WAIFU_PICS = new Set([
  "bite","blush","bonk","bored","cry","cuddle","dance","facepalm",
  "happy","highfive","hug","kick","kiss","laugh","lick","neko",
  "pat","poke","pout","punch","run","shoot","shrug","slap","sleep",
  "smile","smug","stare","think","thumbsup","tickle","triggered",
  "wave","wink","yeet",
]);

const TENOR_TAGS: Record<string, string> = {
  bonk: "anime bonk",
  cringe: "anime cringe",
  lurk: "anime lurk",
  cuddle: "anime cuddle",
  yeet: "anime yeet",
  bite: "anime bite",
  lick: "anime lick",
  smug: "anime smug",
  peck: "anime kiss peck",
  mock: "anime mock",
  dance: "anime dance",
  stare: "anime stare",
  wave: "anime wave",
  smile: "anime smile",
};

export async function getGif(action: string): Promise<string> {
  if (NEKOS_BEST.has(action)) {
    try {
      const res = await fetch(`https://nekos.best/api/v2/${action}`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json() as { results: { url: string }[] };
        const url = data.results?.[0]?.url;
        if (url) return url;
      }
    } catch { /* fall through */ }
  }

  if (WAIFU_PICS.has(action)) {
    try {
      const res = await fetch(`https://api.waifu.pics/sfw/${action}`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json() as { url: string };
        if (data.url) return data.url;
      }
    } catch { /* fall through */ }
  }

  // Tenor fallback for actions not in the above APIs
  const tenorTag = TENOR_TAGS[action] ?? `anime ${action}`;
  try {
    const res = await fetch(
      `https://g.tenor.com/v1/search?q=${encodeURIComponent(tenorTag)}&key=LIVDSRZULELA&limit=8&contentfilter=medium`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json() as { results: { media: { gif: { url: string } }[][] }[] };
      const results = data.results ?? [];
      if (results.length) {
        const pick = results[Math.floor(Math.random() * Math.min(results.length, 8))];
        const url = pick?.media?.[0]?.gif?.url;
        if (url) return url;
      }
    }
  } catch { /* ignore */ }

  return "";
}
