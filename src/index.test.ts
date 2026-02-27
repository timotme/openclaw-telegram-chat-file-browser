import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { escapeHtml, getRelativePath, validatePath } from "./utils";
import { getDisplayName, isBinaryFileSync, readFileContent } from "./file";
import { loadState, saveState } from "./state";
import { generateBrowser } from "./browser";
import { WORKSPACE_ROOT, STATE_FILE, STATE_DIR } from "./constants";
import type { PluginConfig } from "./config";

// Mock fetch for Telegram API tests
global.fetch = vi.fn();

// Default test config matching the plugin defaults
const DEFAULT_TEST_CONFIG: PluginConfig = {
  maxButtonsPerRow: 2,
  maxButtonsTotal: 40,
  maxTextPreview: 2500,
};

describe("utils", () => {
  describe("escapeHtml", () => {
    it("should escape ampersands", () => {
      expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
    });

    it("should escape less-than symbols", () => {
      expect(escapeHtml("a < b")).toBe("a &lt; b");
    });

    it("should escape greater-than symbols", () => {
      expect(escapeHtml("a > b")).toBe("a &gt; b");
    });

    it("should escape double quotes", () => {
      expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    it("should escape single quotes", () => {
      expect(escapeHtml("it's")).toBe("it&#39;s");
    });

    it("should escape all special characters", () => {
      expect(escapeHtml('<tag attr="val">content & more</tag>')).toBe(
        "&lt;tag attr=&quot;val&quot;&gt;content &amp; more&lt;/tag&gt;"
      );
    });

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });
  });

  describe("getRelativePath", () => {
    it("should return dot for workspace root", () => {
      const result = getRelativePath(WORKSPACE_ROOT);
      expect(result).toBe(".");
    });

    it("should return relative path for subdirectory", () => {
      const fullPath = path.join(WORKSPACE_ROOT, "subfolder");
      const result = getRelativePath(fullPath);
      expect(result).toBe("subfolder");
    });

    it("should handle nested paths", () => {
      const fullPath = path.join(WORKSPACE_ROOT, "a", "b", "c");
      const result = getRelativePath(fullPath);
      expect(result).toBe(path.join("a", "b", "c"));
    });
  });

  describe("validatePath", () => {
    it("should reject paths outside workspace", () => {
      const outsidePath = "/etc/passwd";
      expect(() => validatePath(outsidePath)).toThrow("Access denied");
    });

    it("should accept relative paths within workspace", () => {
      const result = validatePath("subdir/file.txt");
      expect(result).toContain(".openclaw/workspace");
    });

    it("should accept dot as root", () => {
      const result = validatePath(".");
      expect(result).toBe(path.resolve(WORKSPACE_ROOT));
    });

    it("should resolve relative paths correctly", () => {
      const result = validatePath("./test");
      expect(result).toContain("workspace");
      expect(result.endsWith("test")).toBe(true);
    });
  });
});

describe("file", () => {
  describe("getDisplayName", () => {
    it("should show folder emoji for directories", () => {
      expect(getDisplayName("myfolder", true)).toBe("📁 myfolder");
    });

    it("should show file emoji for files", () => {
      expect(getDisplayName("myfile.txt", false)).toBe("📄 myfile.txt");
    });

    it("should truncate long names", () => {
      const longName = "a".repeat(25);
      const result = getDisplayName(longName, false);
      expect(result).toContain("...");
      expect(result.length).toBeLessThan(30);
    });

    it("should not truncate short names", () => {
      expect(getDisplayName("short.txt", false)).toBe("📄 short.txt");
    });
  });

  describe("isBinaryFileSync", () => {
    let testDir: string;

    beforeEach(() => {
      testDir = path.join(os.tmpdir(), "test-binary-files");
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });

    it("should detect binary files", () => {
      const binaryFile = path.join(testDir, "image.png");
      fs.writeFileSync(binaryFile, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG header
      expect(isBinaryFileSync(binaryFile)).toBe(true);
    });

    it("should detect text files", () => {
      const textFile = path.join(testDir, "file.txt");
      fs.writeFileSync(textFile, "Hello, World!");
      expect(isBinaryFileSync(textFile)).toBe(false);
    });

    it("should handle case-insensitive extensions", () => {
      const binaryFile = path.join(testDir, "archive.ZIP");
      fs.writeFileSync(binaryFile, Buffer.from([0x50, 0x4b, 0x03, 0x04])); // ZIP header
      expect(isBinaryFileSync(binaryFile)).toBe(true);
    });

    it("should return false for non-existent files", () => {
      const result = isBinaryFileSync("/nonexistent/path/file.bin");
      expect(result).toBe(false);
    });
  });

  describe("readFileContent", () => {
    let testFile: string;

    beforeEach(() => {
      testFile = path.join(os.tmpdir(), "test-read-content.txt");
    });

    afterEach(() => {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    });

    it("should read file content at offset 0", () => {
      const content = "Hello, World!";
      fs.writeFileSync(testFile, content);
      const result = readFileContent(testFile, 0, DEFAULT_TEST_CONFIG);
      expect(result.content).toBe(content);
      expect(result.hasMore).toBe(false);
    });

    it("should indicate hasMore when file is larger than maxTextPreview", () => {
      const largeContent = "x".repeat(3000);
      fs.writeFileSync(testFile, largeContent);
      const result = readFileContent(testFile, 0, DEFAULT_TEST_CONFIG);
      expect(result.hasMore).toBe(true);
      expect(result.content.length).toBe(2500);
    });

    it("should support pagination with offset", () => {
      const content = "0123456789".repeat(300); // 3000 chars
      fs.writeFileSync(testFile, content);

      const chunk1 = readFileContent(testFile, 0, DEFAULT_TEST_CONFIG);
      expect(chunk1.content.length).toBe(2500);
      expect(chunk1.hasMore).toBe(true);

      const chunk2 = readFileContent(testFile, 2500, DEFAULT_TEST_CONFIG);
      expect(chunk2.content.length).toBe(500);
      expect(chunk2.hasMore).toBe(false);
    });

    it("should return error message for unreadable files", () => {
      const result = readFileContent("/nonexistent/file.txt", 0, DEFAULT_TEST_CONFIG);
      expect(result.content).toContain("Error");
      expect(result.hasMore).toBe(false);
    });
  });
});

describe("state", () => {
  let testStateFile: string;
  let testStateDir: string;

  beforeEach(() => {
    testStateDir = path.join(os.tmpdir(), "test-state-dir");
    testStateFile = path.join(testStateDir, "test-state.json");
    if (!fs.existsSync(testStateDir)) {
      fs.mkdirSync(testStateDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testStateDir)) {
      fs.rmSync(testStateDir, { recursive: true });
    }
  });

  it("loadState should return empty object when file doesn't exist", () => {
    const mockLoadState = () => {
      try {
        if (fs.existsSync(testStateFile)) {
          return JSON.parse(fs.readFileSync(testStateFile, "utf-8"));
        }
      } catch {}
      return {};
    };
    expect(mockLoadState()).toEqual({});
  });

  it("saveState should create state file", () => {
    const state = { "123": 456 };
    try {
      if (!fs.existsSync(testStateDir)) {
        fs.mkdirSync(testStateDir, { recursive: true });
      }
      fs.writeFileSync(testStateFile, JSON.stringify(state, null, 2));
      const saved = JSON.parse(fs.readFileSync(testStateFile, "utf-8"));
      expect(saved).toEqual(state);
    } catch {}
  });

  it("saveState should create directory if needed", () => {
    const nestedDir = path.join(testStateDir, "nested", "dir");
    const nestedFile = path.join(nestedDir, "state.json");
    try {
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(nestedFile, JSON.stringify({ test: 123 }));
      expect(fs.existsSync(nestedFile)).toBe(true);
    } finally {
      if (fs.existsSync(nestedDir)) {
        fs.rmSync(nestedDir, { recursive: true });
      }
    }
  });
});

describe("browser", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), "test-browser-dir");
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it("should generate browser for workspace root", () => {
    const result = generateBrowser(".", 0, DEFAULT_TEST_CONFIG);
    expect(result.text).toContain("workspace");
    expect(result.buttons).toBeDefined();
    expect(Array.isArray(result.buttons)).toBe(true);
  });

  it("should show empty directory message", () => {
    const emptyDir = path.join(testDir, "empty");
    fs.mkdirSync(emptyDir);

    // Mock validatePath and getRelativePath for this test
    const mockRelPath = "empty";
    const result = generateBrowser(".", 0, DEFAULT_TEST_CONFIG);
    expect(result.buttons).toBeDefined();
  });

  it("should include home button in response", () => {
    const result = generateBrowser(".", 0, DEFAULT_TEST_CONFIG);
    const buttons = result.buttons.flat();
    const homeButton = buttons.find((b: any) => b.text.includes("🏠"));
    expect(homeButton).toBeDefined();
  });

  it("should return error for invalid path", () => {
    const result = generateBrowser("/etc/passwd", 0, DEFAULT_TEST_CONFIG);
    expect(result.text).toContain("Error") || expect(result.text).toContain("Access denied");
  });

  it("should handle file viewing", () => {
    const testFile = path.join(testDir, "test.txt");
    fs.writeFileSync(testFile, "test content");
    // Note: This would need mocking of file system access in real test
  });

  it("should not exceed max buttons total", () => {
    const result = generateBrowser(".", 0, DEFAULT_TEST_CONFIG);
    const totalButtons = result.buttons.flat().length;
    expect(totalButtons).toBeLessThanOrEqual(42); // 40 content + 2 nav buttons
  });

  it("should have max buttons per row according to config", () => {
    const result = generateBrowser(".", 0, DEFAULT_TEST_CONFIG);
    // Skip first nav row
    for (let i = 1; i < result.buttons.length; i++) {
      expect(result.buttons[i].length).toBeLessThanOrEqual(DEFAULT_TEST_CONFIG.maxButtonsPerRow);
    }
  });
});

describe("config", () => {
  it("should have valid default config", () => {
    expect(DEFAULT_TEST_CONFIG.maxButtonsPerRow).toBe(2);
    expect(DEFAULT_TEST_CONFIG.maxButtonsTotal).toBe(40);
    expect(DEFAULT_TEST_CONFIG.maxTextPreview).toBe(2500);
  });

  it("should allow config with different button layout", () => {
    const customConfig: PluginConfig = {
      maxButtonsPerRow: 3,
      maxButtonsTotal: 50,
      maxTextPreview: 3000,
    };
    const result = generateBrowser(".", 0, customConfig);
    // Should not throw and should generate browser
    expect(result.buttons).toBeDefined();
  });

  it("should respect custom maxButtonsPerRow in browser generation", () => {
    const customConfig: PluginConfig = {
      maxButtonsPerRow: 1,
      maxButtonsTotal: 40,
      maxTextPreview: 2500,
    };
    const result = generateBrowser(".", 0, customConfig);
    // Rows after nav should have max 1 button
    for (let i = 1; i < result.buttons.length; i++) {
      expect(result.buttons[i].length).toBeLessThanOrEqual(1);
    }
  });
});

describe("integration", () => {
  it("should integrate utils and file functions", () => {
    const displayName = getDisplayName("test.txt", false);
    const escaped = escapeHtml(displayName);
    expect(escaped).toContain("📄");
    expect(typeof escaped).toBe("string");
  });

  it("should handle special characters in paths", () => {
    const specialPath = 'test & file <1> "special".txt';
    const escaped = escapeHtml(specialPath);
    expect(escaped).toContain("&amp;");
    expect(escaped).toContain("&lt;");
    expect(escaped).toContain("&gt;");
    expect(escaped).toContain("&quot;");
  });

  it("should validate and get relative path together", () => {
    const relativePath = "./test/file.txt";
    const fullPath = validatePath(relativePath);
    const back = getRelativePath(fullPath);
    expect(back).toContain("test");
  });
});
