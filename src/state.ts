import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { STATE_FILE, STATE_DIR, BrowserState } from "./constants.ts";

export function loadState(): BrowserState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

export function saveState(state: BrowserState) {
  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}
