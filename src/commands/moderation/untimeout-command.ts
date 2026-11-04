import { command as unmuteCommand } from "./untimeout.js";

// Expose both Discord slash-command names while sharing one implementation.
export const command = {
  ...unmuteCommand,
  name: "untimeout",
  aliases: ["unmute"],
};
