import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { handlebrowse, handleDownload } from "./src/handlers.ts";
import { loadConfig } from "./src/config.ts";

export default function register(api: OpenClawPluginApi) {
  // Load configuration
  let config;
  try {
    config = loadConfig(api);
    api.logger?.info(
      `[telegram-file-browser] Configuration loaded: maxButtonsPerRow=${config.maxButtonsPerRow}, maxButtonsTotal=${config.maxButtonsTotal}, maxTextPreview=${config.maxTextPreview}`
    );
  } catch (e: any) {
    api.logger?.error(`[telegram-file-browser] Configuration error: ${e.message}`);
    // Use defaults if validation fails
    config = {
      maxButtonsPerRow: 2,
      maxButtonsTotal: 40,
      maxTextPreview: 2500,
    };
  }

  api.registerCommand({
    name: "browse",
    description: "Open file browser",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: any) => {
      const pathWithOffset = ctx.args?.trim() || ".";
      // Only send new message if user typed /browse without clicking a button
      // Button clicks (which provide args) should edit the existing message
      const alwaysSendNew = !ctx.args;
      return handlebrowse(ctx, pathWithOffset, alwaysSendNew, config);
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
      return handleDownload(ctx, filePath, config);
    },
  });

  api.logger?.info("[telegram-file-browser] Plugin registered (full control mode)");
}
