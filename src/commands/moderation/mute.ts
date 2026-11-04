// Slash-command compatibility alias for timeout. Logic is shared to avoid divergent mute behavior.
import { command as timeoutCommand } from "./timeout.js";
import type { HybridCommand } from "../../lib/command.js";

export const command: HybridCommand = {
  ...timeoutCommand,
  name: "mute",
  aliases: ["timeout"],
  description: "Mute (timeout) a member for a set duration.",
  usage: "mute <member> <duration> [reason]",
};
