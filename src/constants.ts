import { join } from "path";
import { homedir } from "os";

export const WORKSPACE_ROOT = join(homedir(), ".openclaw", "workspace");

// Default state directory - can be overridden via getStateDir()
export const DEFAULT_STATE_DIR = join(homedir(), ".openclaw", "extensions", "openclaw-telegram-file-browser");

export function getStateDir(baseDir?: string): string {
  return baseDir || DEFAULT_STATE_DIR;
}

export function getStateFile(baseDir?: string): string {
  return join(getStateDir(baseDir), "state.json");
}

// State: chatId -> messageId
export type BrowserState = Record<string, number>;

// File view state: `${chatId}_${filePath}` -> { offset: number }
export type FileViewState = Record<string, { offset: number }>;
