import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

/**
 * Configuration for the telegram file browser plugin.
 * All values are validated and have sensible defaults.
 *
 * - maxButtonsPerRow: Number of buttons per row in the file browser (1-4, default 2)
 * - maxButtonsTotal: Maximum total buttons to display (10-100, default 40)
 * - maxTextPreview: Maximum bytes to display per text file chunk (500-10000, default 2500)
 */
export interface PluginConfig {
  maxButtonsPerRow: number;
  maxButtonsTotal: number;
  maxTextPreview: number;
}

const DEFAULTS: PluginConfig = {
  maxButtonsPerRow: 2,
  maxButtonsTotal: 40,
  maxTextPreview: 2500,
};

/**
 * Loads and validates configuration from the OpenClaw API.
 * Uses defaults for any missing values.
 */
export function loadConfig(api: OpenClawPluginApi): PluginConfig {
  const config = (api.config?.plugins?.entries?.["openclaw-telegram-file-browser"]?.config || {}) as Record<
    string,
    any
  >;

  const maxButtonsPerRow = (config.maxButtonsPerRow as number | undefined) ?? DEFAULTS.maxButtonsPerRow;
  const maxButtonsTotal = (config.maxButtonsTotal as number | undefined) ?? DEFAULTS.maxButtonsTotal;
  const maxTextPreview = (config.maxTextPreview as number | undefined) ?? DEFAULTS.maxTextPreview;

  // Validate ranges
  if (maxButtonsPerRow < 1 || maxButtonsPerRow > 4) {
    throw new Error(
      `Invalid maxButtonsPerRow: ${maxButtonsPerRow}. Must be between 1 and 4.`
    );
  }
  if (maxButtonsTotal < 10 || maxButtonsTotal > 100) {
    throw new Error(
      `Invalid maxButtonsTotal: ${maxButtonsTotal}. Must be between 10 and 100.`
    );
  }
  if (maxTextPreview < 500 || maxTextPreview > 10000) {
    throw new Error(
      `Invalid maxTextPreview: ${maxTextPreview}. Must be between 500 and 10000.`
    );
  }

  return {
    maxButtonsPerRow,
    maxButtonsTotal,
    maxTextPreview,
  };
}
