import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";
import { activeDrop } from "../../features/drops.js";
import { db } from "../../db/index.js";
import { guildSettings } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { addBalance } from "../../features/economy.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "dropmanual",
  description: "(Owner) Manually trigger a coin drop in a specific server.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID to trigger the drop in", type: ApplicationCommandOptionType.String, required: true },
    { name: "amount", description: "Coin amount (default: random 250-750)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id", true)!;
    const amount = ctx.getNumber("amount") ?? (250 + Math.floor(Math.random() * 500));

    const rows = await db.select({ dropChannel: guildSettings.dropChannel }).from(guildSettings).where(eq(guildSettings.guildId, guildId));
    const channelId = rows[0]?.dropChannel;
    if (!channelId) return ctx.reply({ embeds: [errorEmbed(`guild \`${guildId}\` has no drop channel configured.`)] });

    const guild = ctx.client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("drop channel not found or not text-based.")] });

    const embed = new EmbedBuilder()
      .setColor(0xf9c74f)
      .setTitle("🎁 coin drop!")
      .setDescription(`**${amount.toLocaleString()} coins** just dropped!\n\ntype \`claim\` to grab them — first come, first served!`)
      .setFooter({ text: "mourn drops • be quick!" })
      .setTimestamp();

    const msg = await (channel as any).send({ embeds: [embed] }).catch(() => null);
    if (!msg) return ctx.reply({ embeds: [errorEmbed("failed to send drop message.")] });

    activeDrop.set(guildId, { amount, messageId: msg.id });

    const col = (channel as any).createMessageCollector?.({
      filter: (m: any) => !m.author.bot && m.content.toLowerCase().trim() === "claim",
      max: 1,
      time: 10 * 60 * 1000,
    });

    col?.on("collect", async (m: any) => {
      const drop = activeDrop.get(guildId);
      if (!drop) return;
      activeDrop.delete(guildId);
      await addBalance(guildId, m.author.id, drop.amount).catch(() => {});
      await m.reply({ embeds: [new EmbedBuilder().setColor(0x2D6A4F).setDescription(`🎉 **${m.author.username}** claimed the drop! +${drop.amount.toLocaleString()} coins.`).setTimestamp()] }).catch(() => {});
      msg.edit({ embeds: [new EmbedBuilder().setColor(0x555555).setDescription(`✅ claimed by **${m.author.username}**.`).setTimestamp()] }).catch(() => {});
    });

    col?.on("end", (_: any, reason: string) => {
      if (reason === "time") {
        activeDrop.delete(guildId);
        msg.edit({ embeds: [new EmbedBuilder().setColor(0x555555).setDescription("💨 nobody claimed this drop in time.").setTimestamp()] }).catch(() => {});
      }
    });

    return ctx.reply({ embeds: [successEmbed(`drop of **${amount.toLocaleString()} coins** fired in **${guild?.name ?? guildId}**.`)], ephemeral: true });
  },
};
