export interface CommandLogEntry {
  userId: string;
  username: string;
  guildId: string;
  guildName: string;
  command: string;
  timestamp: Date;
}

export interface ErrorLogEntry {
  message: string;
  stack?: string;
  timestamp: Date;
}

export const ownerState = {
  ghostMode: false,
  maintenanceMode: false,
  lockedUsers: new Set<string>(),
  errorLog: [] as ErrorLogEntry[],
  commandLog: [] as CommandLogEntry[],
  trolledUsers: new Map<string, number>(),
  hauntedUsers: new Map<string, number>(),
  watchedUsers: new Set<string>(),
  fakeLagActive: false,
  statusRotation: [] as string[],
  statusRotationIndex: 0,
  statusRotationInterval: null as ReturnType<typeof setInterval> | null,
  // ── New owner controls ────────────────────────────────────────────────────
  globalCooldownBypass: false,
  frozenGuilds: new Set<string>(),
  disabledGuilds: new Set<string>(),
};

export function logCommand(entry: CommandLogEntry): void {
  ownerState.commandLog.unshift(entry);
  if (ownerState.commandLog.length > 500) ownerState.commandLog.length = 500;
}

export function logError(message: string, stack?: string): void {
  ownerState.errorLog.unshift({ message, stack, timestamp: new Date() });
  if (ownerState.errorLog.length > 100) ownerState.errorLog.length = 100;
}
