import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getEconomy } from "../../features/economy.js";
import { db } from "../../db/index.js";
import { economy, levels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";
import { errorEmbed } from "../../lib/embeds.js";

const PRESTIGE_LEVEL_REQUIRED = 25;
const PRESTIGE_BALANCE_REQUIRED = 50_000;

export const command: HybridCommand = {
  name: "prestige",
  aliases: ["pres", "rankup"],
  description: "Reset your level and economy in exchange for a prestige badge.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;

    const [eco, levelRow] = await Promise.all([
      getEconomy(ctx.guild.id, ctx.user.id),
      db.select().from(levels).where(and(eq(levels.guildId, ctx.guild.id), eq(levels.userId, ctx.user.id))).then(r => r[0] ?? null),
    ]);

    const level = levelRow?.level ?? 0;

    if (level < PRESTIGE_LEVEL_REQUIRED) {
      return ctx.reply({ embeds: [errorEmbed(`you need to be at least **level ${PRESTIGE_LEVEL_REQUIRED}** to prestige. you're level **${level}**.`)] });
    }
    if (eco.balance < PRESTIGE_BALANCE_REQUIRED) {
      return ctx.reply({ embeds: [errorEmbed(`you need at least **${PRESTIGE_BALANCE_REQUIRED.toLocaleString()} coins** to prestige.`)] });
    }

    const nextPrestige = eco.prestige + 1;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`prestige_confirm_${ctx.user.id}_${ctx.guild.id}`).setLabel("✅ prestige").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`prestige_cancel_${ctx.user.id}`).setLabel("❌ cancel").setStyle(ButtonStyle.Secondary),
    );

    const msg = await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff9800)
          .setTitle(`⭐ prestige ${nextPrestige}`)
          .setDescription([
            `are you sure you want to prestige?`,
            ``,
            `**this will reset:**`,
            `• balance → 0`,
            `• bank → 0`,
            `• level → 0`,
            `• xp → 0`,
            `• daily streak → 0`,
            ``,
            `**you'll receive:**`,
            `• ⭐ prestige ${nextPrestige} badge on your profile`,
            ``,
            `⚠️ this cannot be undone.`,
          ].join("\n"))
          .setFooter({ text: `${config.embedFooter} • economy` })
          .setTimestamp(),
      ],
      components: [row as any],
    }) as any;

    const msgObj = ctx.source === "slash" ? await (ctx.raw as any).fetchReply().catch(() => null) : msg;

    const collector = msgObj?.createMessageComponentCollector?.({
      filter: (i: any) => i.user.id === ctx.user.id,
      max: 1,
      time: 30_000,
    });

    collector?.on("collect", async (i: any) => {
      if (!i.customId.startsWith("prestige_confirm")) {
        await i.update({ embeds: [new EmbedBuilder().setColor(config.neutralColor).setDescription("prestige cancelled.").setTimestamp()], components: [] }).catch(() => {});
        return;
      }

      const gId = i.customId.split("_")[3]!;

      await db.update(economy).set({ balance: 0, bank: 0, streak: 0, streakUpdatedAt: null, lastDaily: null, prestige: nextPrestige }).where(and(eq(economy.guildId, gId), eq(economy.userId, ctx.user.id)));
      await db.update(levels).set({ xp: 0, level: 0 }).where(and(eq(levels.guildId, gId), eq(levels.userId, ctx.user.id)));

      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle(`⭐ prestige ${nextPrestige} achieved`)
            .setDescription(`you've ascended. everything reset. the grind starts again.\n\n⭐ **prestige ${nextPrestige}** badge is now on your profile.`)
            .setFooter({ text: `${config.embedFooter} • economy` })
            .setTimestamp(),
        ],
        components: [],
      }).catch(() => {});
    });
  },
};
