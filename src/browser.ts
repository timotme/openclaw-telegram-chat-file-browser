import { existsSync, statSync, readdirSync } from "fs";
import { dirname } from "path";
import { MAX_BUTTONS_PER_ROW, MAX_BUTTONS_TOTAL, MAX_TEXT_PREVIEW } from "./constants.ts";
import { validatePath, getRelativePath, escapeHtml } from "./utils.ts";
import { getDisplayName, isBinaryFileSync, readFileContent } from "./file.ts";

export function generateBrowser(path: string, offset: number = 0): { text: string; buttons: any[][] } {
  try {
    const fullPath = validatePath(path);

    if (!existsSync(fullPath)) {
      return { text: `❌ Path not found: ${getRelativePath(fullPath)}`, buttons: [] };
    }

    const stats = statSync(fullPath);

    if (!stats.isDirectory()) {
      const relPath = getRelativePath(fullPath);
      const parentDir = getRelativePath(dirname(fullPath));

      const buttons = [
        [
          { text: "⬆️ Up", callback_data: `/browse ${parentDir}` },
          { text: "🏠 Home", callback_data: "/browse ." },
        ],
      ];

      // Check if file is binary
      const isBinary = isBinaryFileSync(fullPath);

      if (isBinary) {
        // Binary file - show message and download button
        const ext = fullPath.split(".").pop()?.toUpperCase() || "BINARY";
        buttons.push([
          { text: "📥 Download", callback_data: `/download ${relPath}` },
        ]);
        return {
          text: `📄 <b>${escapeHtml(relPath)}</b>\n\n<i>Binary file — cannot preview (.${ext} file)</i>\n\nUse the Download button to get the file.`,
          buttons,
        };
      }

      // Text file - show content with pagination
      const content = readFileContent(fullPath);

      // Handle pagination for large files
      const chunk = content.slice(offset, offset + MAX_TEXT_PREVIEW);
      const hasMore = offset + MAX_TEXT_PREVIEW < content.length;
      const truncationNote = hasMore ? "\n\n<i>... (truncated) - use Next to see more</i>" : "";

      // Add pagination buttons if needed
      if (offset > 0 || hasMore) {
        const navButtons: any[] = [];
        if (offset > 0) {
          const prevOffset = Math.max(0, offset - MAX_TEXT_PREVIEW);
          navButtons.push({
            text: "⬅️ Previous",
            callback_data: `/browse ${relPath}:${prevOffset}`,
          });
        }
        if (hasMore) {
          const nextOffset = offset + MAX_TEXT_PREVIEW;
          navButtons.push({
            text: "Next ➡️",
            callback_data: `/browse ${relPath}:${nextOffset}`,
          });
        }
        if (navButtons.length > 0) {
          buttons.push(navButtons);
        }
      }

      buttons.push([
        { text: "📥 Download", callback_data: `/download ${relPath}` },
      ]);

      return {
        text: `📄 <b>${escapeHtml(relPath)}</b>\n\n<pre>${escapeHtml(chunk)}</pre>${truncationNote}`,
        buttons,
      };
    }

    const entries = readdirSync(fullPath, { withFileTypes: true });
    const sorted = entries.sort((a: any, b: any) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const relPath = getRelativePath(fullPath);
    const header = relPath === "." ? "📂 <b>workspace</b>" : `📂 <b>${escapeHtml(relPath)}/</b>`;

    const keyboard: any[][] = [];
    const navRow: any[] = [{ text: "🏠 Home", callback_data: "/browse ." }];
    if (relPath !== ".") {
      const parentDir = getRelativePath(dirname(fullPath));
      navRow.unshift({ text: "⬆️ Up", callback_data: `/browse ${parentDir}` });
    }
    keyboard.push(navRow);

    let buttonCount = 0;
    let currentRow: any[] = [];

    for (const entry of sorted) {
      if (buttonCount >= MAX_BUTTONS_TOTAL) break;

      const entryRel = relPath === "." ? entry.name : `${relPath}/${entry.name}`;
      const button = {
        text: getDisplayName(entry.name, entry.isDirectory()),
        callback_data: `/browse ${entryRel}`,
      };

      currentRow.push(button);
      buttonCount++;

      if (currentRow.length >= MAX_BUTTONS_PER_ROW) {
        keyboard.push(currentRow);
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      keyboard.push(currentRow);
    }

    const emptyNote = sorted.length === 0 ? "\n\n<i>Empty directory</i>" : "";
    return {
      text: `${header}${emptyNote}`,
      buttons: keyboard,
    };
  } catch (e: any) {
    return { text: `❌ Error: ${escapeHtml(e.message)}`, buttons: [] };
  }
}
