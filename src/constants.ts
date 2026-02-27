import { join } from "path";
import { homedir } from "os";

export const WORKSPACE_ROOT = join(homedir(), ".openclaw", "workspace");
export const STATE_DIR = join(homedir(), ".openclaw", "extensions", "telegram-file-browser");
export const STATE_FILE = join(STATE_DIR, "state.json");

export const MAX_BUTTONS_PER_ROW = 2;
export const MAX_BUTTONS_TOTAL = 40;
export const MAX_TEXT_PREVIEW = 2500;

// State: chatId -> messageId
export type BrowserState = Record<string, number>;

// File view state: `${chatId}_${filePath}` -> { offset: number }
export type FileViewState = Record<string, { offset: number }>;
