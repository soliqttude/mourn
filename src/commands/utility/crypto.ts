import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
const ALIASES: Record<string, string> = {
  btc:"bitcoin",eth:"ethereum",bnb:"binancecoin",sol:"solana",ada:"cardano",
  doge:"dogecoin",xrp:"ripple",avax:"avalanche-2",dot:"polkadot",shib:"shiba-inu",
  ltc:"litecoin",link:"chainlink",matic:"matic-network",usdt:"tether",usdc:"usd-coin",
  ton:"the-open-network",near:"near",apt:"aptos",arb:"arbitrum",trx:"tron",
};
export const command: HybridCommand = {
  name: "crypto", aliases: ["coin", "price"], description: "Get a cryptocurrency price.", category: "utility",
  options: [{ name: "coin", description: "Coin symbol or name (btc, eth, sol...)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const input = (ctx.getString("coin", true) ?? ctx.args[0] ?? "").toLowerCase();
    const coinId = ALIASES[input] ?? input;
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`);
      const data = await res.json() as any;
      const info = data[coinId];
      if (!info) return ctx.reply({ embeds: [errorEmbed(`Coin \`${input}\` not found. Try the full name like \`bitcoin\`.`)] });
      const price = info.usd ? `$${info.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "N/A";
      const change = (info.usd_24h_change ?? 0).toFixed(2);
      const mcap = info.usd_market_cap ? `$${(info.usd_market_cap / 1e9).toFixed(2)}B` : "N/A";
      const arrow = parseFloat(change) >= 0 ? "📈" : "📉";
      return ctx.reply({ embeds: [brandEmbed({ title: `${arrow} ${coinId} Price`, fields: [{ name: "💵 USD Price", value: price, inline: true }, { name: "📊 24h Change", value: `${change}%`, inline: true }, { name: "💰 Market Cap", value: mcap, inline: true }], page: "Crypto" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch crypto data. CoinGecko may be rate-limited.")] }); }
  },
};
