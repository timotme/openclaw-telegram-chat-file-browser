import { readFileSync, openSync, readSync, closeSync } from "fs";
import { MAX_TEXT_PREVIEW } from "./constants.ts";
import { escapeHtml } from "./utils.ts";

export function getDisplayName(name: string, isDir: boolean): string {
  // Truncate long names to fit Telegram button limits
  const maxLen = 20;
  const display = name.length > maxLen ? name.slice(0, 17) + "..." : name;
  return isDir ? `📁 ${display}` : `📄 ${display}`;
}

export function isBinaryFileSync(filePath: string): boolean {
  // Check file extension against common binary formats
  const binaryExtensions = /\.(webp|png|jpg|jpeg|gif|bmp|ico|exe|dll|so|dylib|zip|tar|gz|rar|7z|pdf|bin|dat|db|sqlite|jar|class)$/i;
  if (binaryExtensions.test(filePath)) {
    return true;
  }

  // Check first 512 bytes for null bytes
  try {
    const fd = openSync(filePath, "r");
    const buffer = Buffer.alloc(512);
    const bytesRead = readSync(fd, buffer, 0, 512, 0);
    closeSync(fd);

    return buffer.slice(0, bytesRead).includes(0);
  } catch {
    // If we can't read, assume it's text
    return false;
  }
}

export function readFileContent(filePath: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    if (content.length > MAX_TEXT_PREVIEW) {
      return content.slice(0, MAX_TEXT_PREVIEW) + "\n\n_... (truncated)_";
    }
    return content;
  } catch (e: any) {
    return `_Error reading file: ${e.message}_`;
  }
}
