// Compatibility alias for setbanner. The implementation remains centralized.
import { command as setbannerCommand } from "./setbanner.js";
import type { HybridCommand } from "../../lib/command.js";

export const command: HybridCommand = {
  ...setbannerCommand,
  name: "serverbanner",
  aliases: ["setbanner"],
  description: "Set the server banner.",
  usage: "serverbanner <url>",
};
