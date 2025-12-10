# Auto Refresh Monitor - Chrome Extension

A Chrome extension that automatically refreshes a page at set intervals and monitors a specific element for changes. When the condition is met, it stops refreshing and plays an alert sound.

## Features

- **Visual Element Picker** - Select any element on the page by hovering and clicking (like DevTools)
- **Multiple Monitoring Modes**:
  - Stop when content changes
  - Stop when element contains specific text
  - Stop when specific text disappears
- **Customizable Refresh Interval** - Set any interval from 1 to 300 seconds
- **Audio Alert** - Plays a sound when condition is met
- **Visual Notification** - Shows on-screen notification when condition is met
- **403 Error Handling** - Automatically clears cookies/cache and opens incognito window when blocked
- **Single Tab Monitoring** - Only monitors the specific page you selected, doesn't affect other tabs

## Installation

### From Source (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/gsahancsc/refresher-ext.git
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked**

5. Select the `refresher-ext` folder (or wherever you cloned/downloaded it)

6. The extension icon will appear in your Chrome toolbar

### Enable Incognito Access (Optional)

For the 403 error bypass feature to work:

1. Go to `chrome://extensions/`
2. Find "Auto Refresh Text Finder"
3. Click **Details**
4. Enable **Allow in Incognito**

## Usage

### Basic Usage

1. **Navigate** to the page you want to monitor

2. **Click** the extension icon in the toolbar

3. **Pick an element** to monitor:
   - Click the **🎯 Pick** button
   - Hover over elements on the page (they will highlight in cyan)
   - Click to select the element you want to monitor
   - The CSS selector will be automatically filled in

4. **Choose a monitoring mode**:
   - **Stop when content changes** - Alerts when the element's content differs from when you started
   - **Stop when contains text** - Alerts when specific text appears in the element
   - **Stop when text disappears** - Alerts when specific text is no longer in the element

5. **Set the refresh interval** (default: 10 seconds)

6. Click **▶ Start Monitoring**

7. The page will refresh at the set interval until the condition is met

### When Condition is Met

- The page stops refreshing
- An alert sound plays
- A visual notification appears on the page
- The extension popup shows "✅ Condition met!"

### Stopping Monitoring

- Click the extension icon and click **⏹ Stop Monitoring**
- Or simply close the tab

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    User clicks Start                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Save initial element content                │
│              Save page URL for tracking                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Check condition immediately                 │
│     (change / contains text / text disappeared)          │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Condition                   Condition
           Met                       Not Met
              │                           │
              ▼                           ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│   Stop & Play Sound  │    │  Wait for interval (10s)     │
│   Show Notification  │    │  Then refresh page           │
└──────────────────────┘    │  Loop back to check          │
                            └──────────────────────────────┘
```

## 403 Error Handling

If the page returns a 403 Forbidden error while monitoring:

1. A notification appears: "⚠️ 403 Forbidden Detected"
2. The extension clears:
   - All cookies
   - Cache and cache storage
   - localStorage and sessionStorage
   - IndexedDB
   - Service workers
3. After 10 seconds, opens the page in an **incognito window**

This helps bypass rate limiting and fingerprinting-based blocks.

## Files Structure

```
refresher-ext/
├── manifest.json      # Extension configuration
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── content.js         # Page monitoring logic
├── picker.js          # Visual element picker
├── background.js      # Service worker for audio & 403 handling
├── offscreen.html     # Required for audio playback (Manifest V3)
├── offscreen.js       # Audio playback logic
├── alert.mp3          # Alert sound file
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

## Permissions

The extension requires these permissions:

| Permission | Purpose |
|------------|---------|
| `storage` | Save monitoring settings |
| `activeTab` | Access current tab for element picking |
| `scripting` | Inject picker and monitoring scripts |
| `tabs` | Get tab URL for single-tab monitoring |
| `cookies` | Clear cookies on 403 error |
| `browsingData` | Clear cache/storage on 403 error |
| `offscreen` | Play audio in Manifest V3 |

## Troubleshooting

### Element picker not working
- Make sure you reload the extension after installation
- Try refreshing the page before using the picker

### Page not refreshing
- Check that monitoring is active (popup should show "🔄 Monitoring active...")
- Make sure you're on the same URL where you started monitoring

### Sound not playing
- Click "🔊 Test Sound" in the popup to verify audio works
- Check your system volume

### Still getting 403 after clearing
- The site may be using IP-based blocking
- Try using a VPN or different network

## License

MIT License - Feel free to use and modify as needed.
