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
  // Troll mode: userId -> expiry timestamp ms
  trolledUsers: new Map<string, number>(),
  // Haunt mode: userId -> expiry timestamp ms
  hauntedUsers: new Map<string, number>(),
  // Watchlist: set of user IDs to DM owner about
  watchedUsers: new Set<string>(),
  // Fake lag toggle
  fakeLagActive: false,
  // Status rotation
  statusRotation: [] as string[],
  statusRotationIndex: 0,
  statusRotationInterval: null as ReturnType<typeof setInterval> | null,
};

export function logCommand(entry: CommandLogEntry): void {
  ownerState.commandLog.unshift(entry);
  if (ownerState.commandLog.length > 500) ownerState.commandLog.length = 500;
}

export function logError(message: string, stack?: string): void {
  ownerState.errorLog.unshift({ message, stack, timestamp: new Date() });
  if (ownerState.errorLog.length > 100) ownerState.errorLog.length = 100;
}
