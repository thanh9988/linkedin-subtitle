# LinkedIn Learning Subtitle Enhancer

A Chrome extension that replaces LinkedIn Learning's default subtitles with a fully customizable overlay.

## Features

- **Custom subtitle overlay** — replaces the default LinkedIn Learning captions
- **Adjustable font size** (12px–80px), color, and background
- **Background opacity control** for readability
- **Vertical position slider** to place subtitles where you want
- **Toggle on/off** from the popup
- **Settings persist** across sessions via Chrome Storage
- **SPA-aware** — automatically re-initializes on page navigation

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/thanh9988/linkedin-subtitle.git
   ```
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the cloned folder
5. Navigate to any LinkedIn Learning video — the extension activates automatically

## Usage

- Click the extension icon to **toggle subtitles** on/off
- Click **⚙️ Style Settings** to open the in-video settings panel where you can adjust:
  - Font size
  - Font color
  - Background color & opacity
  - Subtitle position

## How It Works

The extension uses multiple strategies to detect active subtitles:

1. Transcript panel active line
2. Video.js text track display elements
3. HTML5 `TextTrack` API (most reliable fallback)

A `MutationObserver` + polling loop ensures subtitles stay in sync with the video.

## Project Structure

```
├── manifest.json      # Chrome Extension manifest (MV3)
├── content.js         # Main content script — subtitle detection & UI
├── subtitle.css       # Styles for subtitle overlay & settings panel
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic (toggle, settings)
└── icons/             # Extension icons (16, 48, 128px)
```

## License

MIT
