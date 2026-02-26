import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  realpathSync,
  statSync,
  readdirSync,
  openSync,
  readSync,
  closeSync,

} from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";

const WORKSPACE_ROOT = join(homedir(), ".openclaw", "workspace");
const STATE_DIR = join(homedir(), ".openclaw", "extensions", "telegram-file-browser");
const STATE_FILE = join(STATE_DIR, "state.json");

const MAX_BUTTONS_PER_ROW = 2;
const MAX_BUTTONS_TOTAL = 40;
const MAX_TEXT_PREVIEW = 2500;

// State: chatId -> messageId
type BrowserState = Record<string, number>;

// File view state: `${chatId}_${filePath}` -> { offset: number }
type FileViewState = Record<string, { offset: number }>;

function loadState(): BrowserState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveState(state: BrowserState) {
  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

async function callTelegramApi(
  botToken: string,
  method: string,
  params: Record<string, unknown>
): Promise<any> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!data.ok) {
    throw new Error((data.description as string) || `Telegram API error`);
  }
  return data;
}

async function sendFileViaTelegram(
  botToken: string,
  chatId: number,
  filePath: string
): Promise<void> {
  try {
    const fileContent = readFileSync(filePath);
    const fileName = filePath.split("/").pop() || "file";

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append(
      "document",
      new Blob([fileContent], { type: "application/octet-stream" }),
      fileName
    );

    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!data.ok) {
      throw new Error((data.description as string) || "Failed to send file");
    }
  } catch (e: any) {
    throw new Error(`Error sending file: ${e.message}`);
  }
}

function getDisplayName(name: string, isDir: boolean): string {
  // Truncate long names to fit Telegram button limits
  const maxLen = 20;
  const display = name.length > maxLen ? name.slice(0, 17) + "..." : name;
  return isDir ? `📁 ${display}` : `📄 ${display}`;
}

function validatePath(requestedPath: string): string {
  let fullPath: string;
  if (requestedPath.startsWith("/")) {
    fullPath = requestedPath;
  } else {
    fullPath = join(WORKSPACE_ROOT, requestedPath);
  }

  const resolvedPath = resolve(fullPath);
  const resolvedWorkspace = resolve(WORKSPACE_ROOT);

  if (!resolvedPath.startsWith(resolvedWorkspace)) {
    throw new Error("Access denied: path outside workspace");
  }

  if (existsSync(resolvedPath)) {
    try {
      const realPath = realpathSync(resolvedPath);
      if (!realPath.startsWith(resolvedWorkspace)) {
        throw new Error("Access denied: symlink points outside workspace");
      }
    } catch {}
  }

  return resolvedPath;
}

function getRelativePath(fullPath: string): string {
  const resolvedPath = resolve(fullPath);
  const resolvedWorkspace = resolve(WORKSPACE_ROOT);
  return resolvedPath.substring(resolvedWorkspace.length).replace(/^\//, "") || ".";
}

function escapeMarkdown(text: string): string {
  // Escape Telegram MarkdownV2 special chars
  return text
    .replace(/[_*\[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function readFileContent(filePath: string): string {
  try {
    const fd = openSync(filePath, "r");
    const buffer = Buffer.alloc(1024);
    const bytesRead = readSync(fd, buffer, 0, 1024, 0);
    closeSync(fd);

    if (buffer.slice(0, bytesRead).includes(0)) {
      return "_Binary file — cannot display_";
    }

    const content = readFileSync(filePath, "utf-8");
    if (content.length > MAX_TEXT_PREVIEW) {
      return content.slice(0, MAX_TEXT_PREVIEW) + "\n\n_... (truncated)_";
    }
    return content;
  } catch (e: any) {
    return `_Error reading file: ${e.message}_`;
  }
}

function generateBrowser(path: string, offset: number = 0): { text: string; buttons: any[][] } {
  try {
    const fullPath = validatePath(path);

    if (!existsSync(fullPath)) {
      return { text: `❌ Path not found: ${getRelativePath(fullPath)}`, buttons: [] };
    }

    const stats = statSync(fullPath);

    if (!stats.isDirectory()) {
      const content = readFileContent(fullPath);
      const relPath = getRelativePath(fullPath);
      const parentDir = getRelativePath(dirname(fullPath));

      // Handle pagination for large files
      const chunk = content.slice(offset, offset + MAX_TEXT_PREVIEW);
      const hasMore = offset + MAX_TEXT_PREVIEW < content.length;
      const truncationNote = hasMore ? "\n\n_... (truncated) - use Next to see more_" : "";

      const buttons = [
        [
          { text: "⬆️ Up", callback_data: `/filebrowse ${parentDir}` },
          { text: "🏠 Home", callback_data: "/filebrowse ." },
        ],
      ];

      // Add pagination buttons if needed
      if (offset > 0 || hasMore) {
        const navButtons: any[] = [];
        if (offset > 0) {
          const prevOffset = Math.max(0, offset - MAX_TEXT_PREVIEW);
          navButtons.push({
            text: "⬅️ Previous",
            callback_data: `/filebrowse-offset ${fullPath}:${prevOffset}`,
          });
        }
        if (hasMore) {
          const nextOffset = offset + MAX_TEXT_PREVIEW;
          navButtons.push({
            text: "Next ➡️",
            callback_data: `/filebrowse-offset ${fullPath}:${nextOffset}`,
          });
        }
        if (navButtons.length > 0) {
          buttons.push(navButtons);
        }
      }

      buttons.push([
        { text: "📥 Download", callback_data: `/download ${fullPath}` },
      ]);

      return {
        text: `📄 *${escapeMarkdown(relPath)}*\n\n\`\`\`\n${chunk}${truncationNote}\n\`\`\``,
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
    const header = relPath === "." ? "📂 *workspace*" : `📂 *${escapeMarkdown(relPath)}/*`;

    const keyboard: any[][] = [];
    const navRow: any[] = [{ text: "🏠 Home", callback_data: "/filebrowse ." }];
    if (relPath !== ".") {
      const parentDir = getRelativePath(dirname(fullPath));
      navRow.unshift({ text: "⬆️ Up", callback_data: `/filebrowse ${parentDir}` });
    }
    keyboard.push(navRow);

    let buttonCount = 0;
    let currentRow: any[] = [];

    for (const entry of sorted) {
      if (buttonCount >= MAX_BUTTONS_TOTAL) break;

      const entryRel = join(relPath === "." ? "" : relPath, entry.name);
      const button = {
        text: getDisplayName(entry.name, entry.isDirectory()),
        callback_data: `/filebrowse ${entryRel}`,
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

    const emptyNote = sorted.length === 0 ? "\n\n_Empty directory_" : "";
    return {
      text: `${header}${emptyNote}`,
      buttons: keyboard,
    };
  } catch (e: any) {
    return { text: `❌ Error: ${e.message}`, buttons: [] };
  }
}

async function sendOrEditBrowser(
  botToken: string,
  chatId: number,
  path: string,
  state: BrowserState,
  offset: number = 0
): Promise<void> {
  const result = generateBrowser(path, offset);
  const messageId = state[String(chatId)];

  if (messageId) {
    // Try to edit existing message
    try {
      await callTelegramApi(botToken, "editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: result.text,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: result.buttons },
      });
      return;
    } catch (e: any) {
      // Edit failed - message deleted or too old, fall through to send new
    }
  }

  // Send new message
  const response = await callTelegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: result.text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: result.buttons },
  });

  // Store message ID for future edits
  if (response.result?.message_id) {
    state[String(chatId)] = response.result.message_id;
    saveState(state);
  }
}

export default function register(api: OpenClawPluginApi) {
  const state = loadState();

  async function handleFileBrowse(ctx: any, path: string, offset: number = 0): Promise<{ text: string }> {
    // Check if the message comes from Telegram
    if (ctx.channel !== "telegram") {
      return { text: "❌ Channel not supported. Only Telegram is supported for file browsing." };
    }

    // Get Telegram bot token from config
    const botToken = ctx.config.channels?.telegram?.botToken;

    if (!botToken) {
      return { text: "❌ Bot token not configured" };
    }

    // Get chat ID from senderId (in Telegram DMs, chat ID = user ID)
    const chatId = ctx.senderId ? parseInt(ctx.senderId, 10) : undefined;

    if (!chatId || isNaN(chatId)) {
      return { text: "❌ Cannot determine chat ID" };
    }

    // Send or edit the browser message directly via Telegram API
    await sendOrEditBrowser(botToken, chatId, path, state, offset);

    // Return NO_REPLY indicator - we handled sending ourselves
    return { text: "\u200B" }; // Zero-width space - invisible but satisfies response check
  }

  async function handleFileOffset(ctx: any, pathWithOffset: string): Promise<{ text: string }> {
    // Parse path:offset format
    const lastColonIndex = pathWithOffset.lastIndexOf(":");
    if (lastColonIndex === -1) {
      return { text: "❌ Invalid file offset format" };
    }

    const path = pathWithOffset.substring(0, lastColonIndex);
    const offsetStr = pathWithOffset.substring(lastColonIndex + 1);
    const offset = parseInt(offsetStr, 10);

    if (isNaN(offset)) {
      return { text: "❌ Invalid offset value" };
    }

    return handleFileBrowse(ctx, path, offset);
  }

  async function handleDownload(ctx: any, filePath: string): Promise<{ text: string }> {
    // Check if the message comes from Telegram
    if (ctx.channel !== "telegram") {
      return { text: "❌ Channel not supported. Only Telegram is supported for downloads." };
    }

    // Get Telegram bot token from config
    const botToken = ctx.config.channels?.telegram?.botToken;

    if (!botToken) {
      return { text: "❌ Bot token not configured" };
    }

    // Get chat ID from senderId
    const chatId = ctx.senderId ? parseInt(ctx.senderId, 10) : undefined;

    if (!chatId || isNaN(chatId)) {
      return { text: "❌ Cannot determine chat ID" };
    }

    try {
      // Validate the path to ensure it's within workspace
      const validatedPath = validatePath(filePath);

      // Check if file exists and is not a directory
      if (!existsSync(validatedPath)) {
        return { text: `❌ File not found: ${filePath}` };
      }

      const stats = statSync(validatedPath);
      if (stats.isDirectory()) {
        return { text: "❌ Cannot download a directory" };
      }

      // Send the file via Telegram
      await sendFileViaTelegram(botToken, chatId, validatedPath);
      return { text: "\u200B" }; // Zero-width space - invisible
    } catch (e: any) {
      return { text: `❌ Error downloading file: ${e.message}` };
    }
  }

  api.registerCommand({
    name: "filebrowse",
    description: "Browse the OpenClaw workspace files",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: any) => {
      const path = ctx.args?.trim() || ".";
      return handleFileBrowse(ctx, path);
    },
  });

  api.registerCommand({
    name: "browse",
    description: "Open file browser",
    acceptsArgs: false,
    requireAuth: true,
    handler: async (ctx: any) => {
      return handleFileBrowse(ctx, ".");
    },
  });

  api.registerCommand({
    name: "download",
    description: "Download a file from the workspace",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: any) => {
      const filePath = ctx.args?.trim();
      if (!filePath) {
        return { text: "❌ No file path specified" };
      }
      return handleDownload(ctx, filePath);
    },
  });

  api.registerCommand({
    name: "filebrowse-offset",
    description: "Browse file with offset (internal command)",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: any) => {
      const pathWithOffset = ctx.args?.trim();
      if (!pathWithOffset) {
        return { text: "❌ No path or offset specified" };
      }
      return handleFileOffset(ctx, pathWithOffset);
    },
  });

  api.logger?.info("[telegram-file-browser] Plugin registered (full control mode)");
}
