# Just Paste it — "jPit" 🚀

> **Bypass arbitrary paste, copy, right-click, and text selection restrictions seamlessly across all web applications.**
> Created with ❤️ by **Thanmai** | Released under the open-source **MIT License**

---

## ✨ Why jPit?

Legacy paste unblocking extensions fail on modern web applications because they rely solely on basic event cancellation (`e.stopImmediatePropagation()`). This frequently breaks **React / Vue / Angular** form component states, ignores `beforeinput` event blockers, fails on closed Shadow DOM elements, and gets hijacked by site hotkey scripts.

**jPit** solves all of these problems through a modular **Dual Execution Engine** architecture running in Manifest V3.

### 🌟 Key Features
- 📋 **Universal Paste Unblocking**: Pastes smoothly into banking fields, login forms, password managers, and restricted inputs.
- ⚛️ **Framework State Synthesizer**: Programmatically updates native input setters and dispatches synthetic `input` and `change` events so React 18, Vue 3, and Angular form states never get overwritten back to empty strings.
- ⚡ **`beforeinput` Shield**: Neutralizes `beforeinput` event blockers (`inputType === 'insertFromPaste'`).
- 📦 **Shadow DOM & Web Component Support**: Hooks `Element.prototype.attachShadow` to automatically extend unblocking shields into Web Components and closed Shadow Roots.
- ⌨️ **System Hotkey Shield**: Protects `Ctrl+V` / `Cmd+V`, `Ctrl+C`, `Ctrl+X`, and `Ctrl+A` from site `keydown` handlers.
- 🖱️ **Right-Click & Selection Unlock**: Brings back custom right-click menus and text highlighting without breaking site UI widgets.
- 🌐 **Shift-Key Bypass**: Hold `Shift + Right Click` at any time to force the native browser context menu.
- 🔒 **100% Private & Offline**: Zero analytics, zero tracking, zero external network requests. 100% offline security.

---

## 📥 How to Install (Quick Setup)

### Option A: Install Unpacked Extension (Chrome, Edge, Brave)

1. **Download / Clone Repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/jPit.git
   ```
   *(Or click **Code ➔ Download ZIP** on GitHub and extract it).*

2. **Open Extensions Page**:
   - **Microsoft Edge**: Go to `edge://extensions/`
   - **Google Chrome**: Go to `chrome://extensions/`
   - **Brave Browser**: Go to `brave://extensions/`

3. **Enable Developer Mode**:
   - Toggle **Developer mode** in the top-right corner.

4. **Load Extension**:
   - Click **Load unpacked** and select the `src` directory inside the jPit folder.
   - 🎉 **Done!** jPit is now active across all websites.

---

### Option B: Firefox Installation

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside the `src/` directory.

---

## 🛠️ Repository Structure

```
jPit/
├── src/                                  # Extension Source Code (Manifest V3)
│   ├── manifest.json                     # Cross-browser MV3 manifest definition
│   ├── lib/
│   │   ├── browser-polyfill.js           # chrome.* / browser.* API normalizer
│   │   └── rule-evaluator.js             # Wildcard & regex domain matcher
│   ├── content/
│   │   ├── main-engine.js                # MAIN world engine: prototype hooks & React synthesizer
│   │   └── isolated-bridge.js           # ISOLATED world bridge: background messaging
│   ├── background/
│   │   └── service-worker.js             # MV3 background worker for settings & rules
│   ├── popup/
│   │   ├── popup.html                    # Glassmorphism dark toolbar popup UI
│   │   ├── popup.js                      # Quick feature toggles
│   │   └── popup.css                     # Custom styles
│   └── options/
│       ├── options.html                  # Advanced domain rules & settings dashboard
│       ├── options.js                    # Rule CRUD engine & JSON import/export
│       └── options.css                   # Dashboard layout
├── tests/                                # Verification Test Suite & Harness
│   ├── harness/
│   │   ├── test-harness.html             # 12 anti-paste test scenarios
│   │   └── server.js                     # Local HTTP server
│   └── anti-bypass.spec.js               # Playwright automated test script
├── LICENSE                               # MIT License
└── README.md                             # Project Documentation
```

---

## 👤 Author & License

- **Author**: Thanmai
- **License**: Released under the [MIT License](LICENSE). Free for everyone to use, modify, and distribute.
