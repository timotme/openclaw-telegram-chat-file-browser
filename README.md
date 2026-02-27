# Telegram File Browser

An OpenClaw plugin that provides a file browser interface for your workspace via Telegram inline buttons.

## Features

- 📁 Browse workspace files and directories via Telegram
- 📄 Preview text files with pagination support
- 🎛️ Configurable UI layout and behavior limits
- 🔐 Binary file detection and handling
- ⚡ Message editing for seamless navigation

## Installation

```bash
npm install openclaw-telegram-file-browser
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

Navigate through your workspace. Click inline buttons to explore directories.

Examples:
- `/browse .` - Start at workspace root
- `/browse folder/subfolder` - Navigate to specific path

### Download command
```
/download <path>
```

Download a file from your workspace via Telegram.

Examples:
- `/download document.pdf`
- `/download project/README.md`

## Requirements

- OpenClaw >= 1.0.0
- Node.js >= 18

## License

MIT
