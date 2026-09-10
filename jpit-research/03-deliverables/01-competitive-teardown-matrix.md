# Competitive Teardown Matrix: Paste Unblockers & Browser Protection Tools

## 1. Executive Summary & Market Landscape

The market for paste unblocking and browser protection tools spans four distinct tiers, ranging from minimalist Chrome Web Store extensions to commercial macOS native applications and specialized open-source userscripts.

- **Tier 1 (Don't F*** With Paste)** focuses on ultra-lightweight capturing event listeners in the `ISOLATED` world. While minimal and fast, it fails on modern SPA frameworks (React/Vue) and ignores advanced anti-paste vectors like `beforeinput` and CSS locks.
- **Tier 2 (Allow Copy Paste +)** broadens coverage to right-click menus and text selection via CSS injection and inline `<script>` tags, but lacks site-specific rule customization and frequently breaks legitimate web app UI widgets.
- **Tier 3 (StopTheMadness Pro)** provides commercial-grade anti-hijacking protections with synthetic event dispatching and keyboard shortcut protection, but is locked behind a $9.99 paid model restricted to the Apple ecosystem (macOS/iOS).
- **Tier 4 (Greasyfork Userscripts)** pioneers advanced DOM monkey-patching (`EventTarget.prototype.addEventListener`, `Element.prototype.attachShadow`) in the `MAIN` execution world, but requires a third-party userscript manager and causes high CPU utilization if unoptimized.

**jPit v1.0** is designed to synthesize the lightweight elegance of Tier 1, the broad coverage of Tier 2, the framework compatibility of Tier 3, and the deep monkey-patching innovation of Tier 4 into a cross-browser, Manifest V3 compliant extension.

---

## 2. Comprehensive Competitive Matrix

| Feature / Architecture Vector | T1: Don't F*** With Paste (v3.1) | T2: Allow Copy Paste (+) (v1.1) | T3: StopTheMadness Pro | T4: Greasyfork Userscripts | **jPit Target Spec (v1.0)** |
|---|---|---|---|---|---|
| **Architecture & Manifest** | MV3 (SW + CS) | MV3 (SW + CS + Inline Script) | Native Host App + Web Ext | Userscript Manager (`unsafeWindow`) | **MV3 Dual-World (ISOLATED + MAIN Engine)** |
| **Primary Execution Context** | `ISOLATED` World | `ISOLATED` + DOM Injection | Native Host + `MAIN` World | `MAIN` Page Context | **Dual Execution (`ISOLATED` SW + `MAIN` DOM Engine)** |
| **Paste (`paste`) Event Unblock** | Capturing listener | Capturing listener + reset | Capturing listener + API hook | Capturing listener + Prototype patch | **Capturing Listener + Synthetic Dispatch Engine** |
| **Copy / Cut Unblock** | Capturing listener | Capturing listener + reset | Intercepted & hardened | Intercepted & reset | **Capturing Listener + Prototype Protection** |
| **`beforeinput` Event Vector** | ❌ Unhandled | ❌ Unhandled | ✅ Intercepted | ✅ Intercepted (CY Fung) | **✅ Native `beforeinput` Normalizer** |
| **Right-Click Context Menu** | ❌ Unhandled | ✅ Global toggle | ✅ Granular per-domain | ✅ Captured & stripped | **✅ Granular per-domain + Shift-bypass** |
| **Text Selection (`selectstart`)** | ❌ Unhandled | ✅ Global CSS injection | ✅ Granular per-domain | ✅ CSS + attribute strip | **✅ Granular CSS + DOM selection engine** |
| **Drag & Drop (`dragstart`)** | ❌ Unhandled | ✅ Handled | ✅ Handled | ✅ Handled | **✅ Handled (Optional toggle)** |
| **Hotkey Hijack Protection** | ❌ Unhandled | ❌ Unhandled | ✅ Cmd/Ctrl+V/C/A/X protected | ⚠️ Partial | **✅ System Hotkey Shield (Cmd/Ctrl+V/C/A/Z/X)** |
| **React / Vue Synthetic State** | ❌ Breaks framework state | ❌ Breaks framework state | ✅ Synthetic `input` dispatch | ⚠️ Partial workaround | **✅ Full Framework Event Synthesizer (React/Vue/Angular)** |
| **Shadow DOM Support** | ❌ Document-level only | ❌ Document-level only | ⚠️ Partial | ✅ `attachShadow` monkey-patch | **✅ Deep Shadow Root Traversal Engine** |
| **Clipboard API Guard** | ❌ Unhandled | ❌ Unhandled | ✅ `navigator.clipboard` hook | ❌ Unhandled | **✅ Safe Clipboard API Proxy** |
| **Rule System & Granularity** | Basic domain regex | Per-tab toggle (no domain rule) | Domain presets + per-feature checkboxes | Site metadata `@include` | **Domain Rules (Exact/Wildcard/Regex) + Quick Mode** |
| **Browser Compatibility** | Chrome, Firefox, Edge, Brave | Chrome, Edge, Brave | Safari, Chrome, Firefox (macOS/iOS only) | Dependent on Userscript Manager | **Chrome, Firefox, Edge, Brave (Win/Mac/Linux)** |
| **License / Pricing** | Free (MIT) | Free / Open Source | Paid ($9.99 App Store) | Free (Open Source) | **Free & Open Source (MIT)** |

---

## 3. Tier-by-Tier Strategic Analysis & Key Insights

### Tier 1 (DFWP) - Lessons & Pitfalls
- **Takeaway**: `stopImmediatePropagation()` alone is insufficient for modern web applications.
- **Strategic Direction for jPit**: Retain DFWP's capturing-phase listener design, but augment it with synthetic event dispatching to avoid breaking React component states.

### Tier 2 (Allow Copy Paste +) - Lessons & Pitfalls
- **Takeaway**: Global CSS injection (`* { user-select: auto !important; }`) creates widespread layout and interaction bugs.
- **Strategic Direction for jPit**: Restrict CSS rule injection to specific targeted input containers or apply selection styling only when right-click/selection protection is explicitly enabled by site rules.

### Tier 3 (StopTheMadness Pro) - Lessons & Pitfalls
- **Takeaway**: StopTheMadness proves that users value keyboard shortcut protection (preventing sites from stealing `Cmd+V`) as much as event unblocking.
- **Strategic Direction for jPit**: Incorporate system hotkey shielding as a core feature of jPit v1.0, while delivering it for free across all desktop operating systems.

### Tier 4 (Greasyfork Userscripts) - Lessons & Pitfalls
- **Takeaway**: Prototype monkey-patching (`EventTarget.prototype.addEventListener` and `Element.prototype.attachShadow`) provides the most bulletproof event unblocking possible.
- **Strategic Direction for jPit**: Leverage Chrome's MV3 `chrome.scripting.registerContentScripts` with `world: 'MAIN'` to deploy native prototype patching without requiring userscript managers.
