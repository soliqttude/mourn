import type { Client, Role } from "discord.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "roleCreate",
  async execute(client: Client, role: Role) {
    await handleAntinukeAction(client, role.guild, "role_create", role.id);
  },
};
