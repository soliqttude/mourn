import type { Client, Guild } from "discord.js";
import { handleVanityChange } from "../features/antinuke.js";

export const event = {
  name: "guildUpdate",
  async execute(client: Client, oldGuild: Guild, newGuild: Guild) {
    if (oldGuild.vanityURLCode && oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      await handleVanityChange(client, newGuild).catch(() => {});
    }
  },
};
