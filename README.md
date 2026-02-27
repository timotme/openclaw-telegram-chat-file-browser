# Telegram File Browser for OpenClaw

A lightweight Telegram-based file explorer for your OpenClaw workspace. This plugin enables structured navigation, text preview with pagination, and file download directly within Telegram using inline buttons. Ideal for quick access on the go or when a full development environment isn’t available.

https://github.com/user-attachments/assets/deb5051b-1e42-4bd9-b5b7-f66975765a6f


## Features

- 📁 Browse workspace files and directories via Telegram using inline buttons
- 📄 Preview text files with pagination support
- 🎛️ Configurable UI layout and behavior limits
- 🔐 Binary file detection and handling
- ⚡ Message editing for seamless navigation

## Installation

```bash
openclaw plugins install openclaw-telegram-file-browser
```

## Configuration

Configure the plugin in your OpenClaw `config.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-telegram-file-browser": {
        "config": {
          "maxButtonsPerRow": 2,
          "maxButtonsTotal": 40,
          "maxTextPreview": 2500
        }
      }
    }
  }
}
```

### Config Options

- **maxButtonsPerRow** (1-4, default: 2) - Number of buttons per row in the file browser UI
- **maxButtonsTotal** (10-100, default: 40) - Maximum total number of file/folder buttons to display
- **maxTextPreview** (500-10000, default: 2500) - Maximum bytes to display per text file chunk

## Usage

### Browse command
```
/browse [path]
```

Navigate through your workspace using inline buttons. Sending the command without any arguments will open the file browser at the workspace root.

**How it works:**
- Send `/browse` (without args) - Opens browser at workspace root with navigation buttons
- Click inline buttons to navigate directories and view files
- The interface updates inline (edits existing messages) when navigating via buttons
- Send `/browse [path]` to jump directly to a specific location

**Examples:**
- `/browse` - Open file browser at workspace root
- `/browse .` - Start at workspace root (explicit)
- `/browse folder/subfolder` - Navigate directly to a specific path
- Click "📁 folder_name" buttons to enter directories
- Click "📄 file_name" buttons to view file contents
- Use "⬆️ Up" and "🏠 Home" buttons for navigation

### Download command
```
/download <path>
```

Download a file from your workspace directly via Telegram. The file is sent as an attachment.

**Examples:**
- `/download document.pdf` - Download a PDF file
- `/download project/README.md` - Download from a subdirectory
- `/download config.json` - Download any file type

## Requirements

- OpenClaw >= 1.0.0
- Node.js >= 18

## License

MIT
