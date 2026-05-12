import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const NAMED_COLORS: [string, string][] = [
  ["#FF0000","Red"], ["#00FF00","Lime"], ["#0000FF","Blue"], ["#FFFF00","Yellow"],
  ["#FF00FF","Magenta"], ["#00FFFF","Cyan"], ["#FF8C00","DarkOrange"], ["#8B0000","DarkRed"],
  ["#006400","DarkGreen"], ["#00008B","DarkBlue"], ["#FF69B4","HotPink"], ["#7B68EE","MediumSlateBlue"],
  ["#32CD32","LimeGreen"], ["#FF4500","OrangeRed"], ["#4169E1","RoyalBlue"], ["#9400D3","DarkViolet"],
  ["#20B2AA","LightSeaGreen"], ["#DC143C","Crimson"], ["#1E90FF","DodgerBlue"], ["#ADFF2F","GreenYellow"],
];
const REWARD = 100;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

export const command: HybridCommand = {
  name: "colorquiz",
  description: "Guess the color name from its hex code! +100 coins for correct answer.",
  category: "fun",
  guildOnly: true,
  async execute(ctx) {
    const idx = Math.floor(Math.random() * NAMED_COLORS.length);
    const [hex, name] = NAMED_COLORS[idx]!;
    const pool = shuffle(NAMED_COLORS.filter((_, i) => i !== idx)).slice(0, 3);
    const options = shuffle([...pool, [hex, name]]);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      options.map(([, n], i) =>
        new ButtonBuilder()
          .setCustomId(`cq_${n === name ? "correct" : "wrong"}_${ctx.user.id}`)
          .setLabel(n)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    const colorInt = parseInt(hex.slice(1), 16);

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(colorInt)
          .setTitle("🎨 color quiz")
          .setDescription(`what color is **\`${hex}\`**?\n\n+${REWARD} coins if correct!`)
          .setFooter({ text: `${config.embedFooter} • fun` })
          .setTimestamp(),
      ],
      components: [row as any],
    });

    const msgObj = ctx.source === "slash" ? await (ctx.raw as any).fetchReply().catch(() => null) : null;

    const collector = msgObj?.createMessageComponentCollector?.({
      filter: (i: any) => i.customId.startsWith("cq_") && i.user.id === ctx.user.id,
      max: 1,
      time: 30_000,
    });

    collector?.on("collect", async (i: any) => {
      const correct = i.customId.split("_")[1] === "correct";
      if (correct && ctx.guild) await addBalance(ctx.guild.id, ctx.user.id, REWARD);
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(correct ? config.successColor : config.errorColor)
            .setTitle("🎨 color quiz")
            .setDescription(correct
              ? `✅ correct! **${name}** (\`${hex}\`). +${REWARD} coins!`
              : `❌ wrong! the color was **${name}** (\`${hex}\`).`)
            .setFooter({ text: `${config.embedFooter} • fun` })
            .setTimestamp(),
        ],
        components: [],
      }).catch(() => {});
    });

    collector?.on("end", (c: any, reason: string) => {
      if (reason === "time" && !c.size) {
        ctx.followUp({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`⏰ time's up! the color was **${name}** (\`${hex}\`).`).setTimestamp()] }).catch(() => {});
      }
    });
  },
};
