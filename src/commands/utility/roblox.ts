import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "roblox",
  aliases: ["rlx", "rbx"], description: "Look up a Roblox user profile.", category: "utility",
  options: [{ name: "username", description: "Roblox username", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const username = (ctx.getString("username", true) ?? ctx.args[0] ?? "").trim();
    if (!username) return ctx.reply({ embeds: [errorEmbed("Please provide a Roblox username.")] });
    try {
      const searchRes = await fetch("https://users.roblox.com/v1/usernames/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }) });
      const searchData = await searchRes.json() as any;
      const user = searchData.data?.[0];
      if (!user) return ctx.reply({ embeds: [errorEmbed(`Roblox user **${username}** not found.`)] });
      const res = await fetch(`https://users.roblox.com/v1/users/${user.id}`);
      const data = await res.json() as any;
      const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png`);
      const avatarData = await avatarRes.json() as any;
      const avatar = avatarData.data?.[0]?.imageUrl;
      return ctx.reply({ embeds: [brandEmbed({ title: `🎮 ${data.name}${data.displayName !== data.name ? ` (${data.displayName})` : ""}`, description: data.description?.slice(0, 300) || "No description.", thumbnail: avatar, fields: [{ name: "🆔 User ID", value: String(data.id), inline: true }, { name: "📅 Joined", value: new Date(data.created).toLocaleDateString(), inline: true }, { name: "🔗 Profile", value: `[View Profile](https://www.roblox.com/users/${data.id}/profile)`, inline: false }], page: "Roblox" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch Roblox profile.")] }); }
  },
};
