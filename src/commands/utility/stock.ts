import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "stock", aliases: ["stonk", "stocks"], description: "Get a live stock price.", category: "utility",
  options: [{ name: "symbol", description: "Stock ticker symbol (AAPL, TSLA, GOOG...)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const sym = (ctx.getString("symbol", true) ?? ctx.args[0] ?? "").toUpperCase().trim();
    if (!sym) return ctx.reply({ embeds: [errorEmbed("Please provide a ticker symbol (e.g. AAPL).")] });
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`, { headers: { "User-Agent": "bleed-bot/1.0" } });
      const data = await res.json() as any;
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) return ctx.reply({ embeds: [errorEmbed(`Stock \`${sym}\` not found or market is closed.`)] });
      const price = meta.regularMarketPrice.toFixed(2);
      const prev = (meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice).toFixed(2);
      const change = (meta.regularMarketPrice - parseFloat(prev)).toFixed(2);
      const pct = ((meta.regularMarketPrice / parseFloat(prev) - 1) * 100).toFixed(2);
      const arrow = parseFloat(change) >= 0 ? "📈" : "📉";
      const currency = meta.currency ?? "USD";
      return ctx.reply({ embeds: [brandEmbed({ title: `${arrow} ${sym} — ${meta.shortName ?? meta.longName ?? sym}`, fields: [{ name: `💵 Price (${currency})`, value: price, inline: true }, { name: "📊 Change", value: `${parseFloat(change) >= 0 ? "+" : ""}${change} (${pct}%)`, inline: true }, { name: "⬅️ Prev Close", value: prev, inline: true }], page: "Stocks" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch stock data.")] }); }
  },
};
