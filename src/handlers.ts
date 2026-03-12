import { existsSync, statSync } from "fs";
import { BrowserState } from "./constants.js";
import type { PluginConfig } from "./config.js";
import { loadState, saveState } from "./state.js";
import { callTelegramApi, sendFileViaTelegram } from "./telegram.js";
import { generateBrowser } from "./browser.js";
import { validatePath } from "./utils.js";

async function sendOrEditBrowser(
  botToken: string,
  chatId: number,
  path: string,
  state: BrowserState,
  offset: number = 0,
  alwaysSendNew: boolean = false,
  config: PluginConfig,
  stateDir?: string
): Promise<void> {
  const result = generateBrowser(path, offset, config);
  const messageId = state[String(chatId)];

  if (messageId && !alwaysSendNew) {
    // Try to edit existing message
    try {
      await callTelegramApi(botToken, "editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: result.text,
        parse_mode: "HTML",
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
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: result.buttons },
  });

  // Store message ID for future edits
  if (response.result?.message_id) {
    state[String(chatId)] = response.result.message_id;
    saveState(state, stateDir);
  }
}

export async function handlebrowse(
  ctx: any,
  pathWithOptionalOffset: string,
  alwaysSendNew: boolean = false,
  config: PluginConfig,
  stateDir?: string
): Promise<{ text?: string }> {
  try {
    // Check if the message comes from Telegram
    if (ctx.channel !== "telegram") {
      return { text: "❌ Channel not supported. Only Telegram is supported for file browsing." };
    }

    // Parse path:offset format if present
    let path = pathWithOptionalOffset;
    let offset = 0;

    const lastColonIndex = pathWithOptionalOffset.lastIndexOf(":");
    if (lastColonIndex > 0) {
      const offsetStr = pathWithOptionalOffset.substring(lastColonIndex + 1);
      const parsedOffset = parseInt(offsetStr, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        path = pathWithOptionalOffset.substring(0, lastColonIndex);
        offset = parsedOffset;
      }
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

    // Load state for this session
    const state = loadState(stateDir);

    // Send or edit the browser message directly via Telegram API
    await sendOrEditBrowser(botToken, chatId, path, state, offset, alwaysSendNew, config, stateDir);

    return { text: "NO_REPLY" };
  } catch (e: any) {
    return { text: `❌ Error: ${e.message}` };
  }
}

export async function handleDownload(
  ctx: any,
  filePath: string,
  config: PluginConfig,
  stateDir?: string
): Promise<{ text: string }> {
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
    return { text: "NO_REPLY" };
  } catch (e: any) {
    return { text: `❌ Error downloading file: ${e.message}` };
  }
}
