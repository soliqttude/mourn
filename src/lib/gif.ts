const NEKOS_BEST = new Set([
  "bite","blush","bored","cry","cuddle","dance","facepalm","feed",
  "happy","highfive","hug","kiss","laugh","pat","poke","pout",
  "punch","shoot","shrug","slap","sleep","smile","smug","stare",
  "think","thumbsup","tickle","wave","wink","yawn","yeet",
]);

export async function getGif(action: string): Promise<string> {
  if (NEKOS_BEST.has(action)) {
    try {
      const res = await fetch(`https://nekos.best/api/v2/${action}`);
      if (res.ok) {
        const data = await res.json() as { results: { url: string }[] };
        const url = data.results?.[0]?.url;
        if (url) return url;
      }
    } catch { /* fall through to waifu.pics */ }
  }
  try {
    const res = await fetch(`https://api.waifu.pics/sfw/${action}`);
    if (res.ok) {
      const data = await res.json() as { url: string };
      if (data.url) return data.url;
    }
  } catch { /* ignore */ }
  return "";
}
