import { readFileSync } from "fs";
import { isBinaryFileSync as checkIsBinaryFile } from "isbinaryfile";
import { MAX_TEXT_PREVIEW } from "./constants.ts";
import { escapeHtml } from "./utils.ts";

export function getDisplayName(name: string, isDir: boolean): string {
  // Truncate long names to fit Telegram button limits
  const maxLen = 20;
  const display = name.length > maxLen ? name.slice(0, 17) + "..." : name;
  return isDir ? `📁 ${display}` : `📄 ${display}`;
}

export function isBinaryFileSync(filePath: string): boolean {
  try {
    return checkIsBinaryFile(filePath);
  } catch {
    // If we can't determine, assume it's text
    return false;
  }
}

export function readFileContent(
  filePath: string,
  offset: number = 0
): { content: string; hasMore: boolean } {
  try {
    const fullContent = readFileSync(filePath, "utf-8");
    const chunk = fullContent.slice(offset, offset + MAX_TEXT_PREVIEW);
    const hasMore = offset + MAX_TEXT_PREVIEW < fullContent.length;

    return {
      content: chunk,
      hasMore,
    };
  } catch (e: any) {
    return {
      content: `_Error reading file: ${e.message}_`,
      hasMore: false,
    };
  }
}
