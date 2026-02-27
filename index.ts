import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { handlebrowse, handleDownload } from "./src/handlers.ts";

export default function register(api: OpenClawPluginApi) {
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
      return handlebrowse(ctx, pathWithOffset, alwaysSendNew);
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

  api.logger?.info("[telegram-file-browser] Plugin registered (full control mode)");
}
