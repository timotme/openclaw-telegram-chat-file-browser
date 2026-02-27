import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { getStateDir, getStateFile, BrowserState } from "./constants.js";

export function loadState(stateDir?: string): BrowserState {
  try {
    const stateFile = getStateFile(stateDir);
    if (existsSync(stateFile)) {
      return JSON.parse(readFileSync(stateFile, "utf-8"));
    }
  } catch {}
  return {};
}

export function saveState(state: BrowserState, stateDir?: string) {
  try {
    const dir = getStateDir(stateDir);
    const stateFile = getStateFile(stateDir);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch {}
}
