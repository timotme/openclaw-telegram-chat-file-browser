import { existsSync, realpathSync } from "fs";
import { join, resolve } from "path";
import { WORKSPACE_ROOT } from "./constants.js";

export function validatePath(requestedPath: string): string {
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

export function getRelativePath(fullPath: string): string {
  const resolvedPath = resolve(fullPath);
  const resolvedWorkspace = resolve(WORKSPACE_ROOT);
  return resolvedPath.substring(resolvedWorkspace.length).replace(/^\//, "") || ".";
}

export function escapeHtml(text: string): string {
  // Escape HTML special characters for Telegram HTML mode
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
