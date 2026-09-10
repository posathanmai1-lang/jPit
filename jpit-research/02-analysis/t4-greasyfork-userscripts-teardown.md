# Tier 4 Competitor Teardown: Greasyfork Userscripts

## 1. Overview & Project Metadata

| Attribute | Details |
|---|---|
| **Ecosystem** | Greasyfork / OpenUserJS User Script Ecosystem |
| **Analyzed Scripts** | 1. Absolute Enable Right Click & Copy (#23772) [C12](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L35)<br>2. Selection and Copying Restorer (Universal) (#427575) [C13](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L36)<br>3. Universal Bypass (#511405) [C14](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L37) |
| **Install Base** | >85,000 combined active users |
| **Target Runtime** | Tampermonkey, Violentmonkey, Scriptish (User Script Managers) |
| **Primary Architecture** | Synchronous `@run-at document-start` DOM Monkey Patching & MutationObserver Engines |

---

## 2. Technical Code Analysis of Top Userscripts

### A. Script 1: Absolute Enable Right Click & Copy (#23772)
- **Author**: Absolute | **Installs**: 53,258 | **License**: BSD [C12](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L35)
- **Core Mechanism**: Provides two operating modes:
  1. **Standard Mode**: Attaches capturing phase listeners to `copy`, `cut`, `paste`, `contextmenu`, `selectstart`, `mousedown`, `mouseup`. It executes `e.stopPropagation()` and cleans event handler attributes (`element.onpaste = null`).
  2. **Absolute Mode (CSS & JS Override)**: Uses an aggressive `MutationObserver` to clear inline event attributes (`oncopy`, `oncontextmenu`, `onselectstart`) as soon as nodes are inserted into the DOM tree. Injects CSS `* { user-select: auto !important; -webkit-user-select: auto !important; }`.

```javascript
// Key mechanism pattern in Absolute Enable Right Click & Copy
const clearAttributes = function(node) {
  const attrs = ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'ondragstart'];
  attrs.forEach(attr => {
    if (node[attr]) node[attr] = null;
    if (node.hasAttribute && node.hasAttribute(attr)) node.removeAttribute(attr);
  });
};

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        clearAttributes(node);
        node.querySelectorAll('*').forEach(clearAttributes);
      }
    });
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
```

### B. Script 2: Selection and Copying Restorer (Universal) (#427575)
- **Author**: CY Fung | **Installs**: 31,016 | **Updated**: April 2024 [C13](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L36)
- **Core Mechanism**: Advanced DOM Prototype Monkey Patching in the Page (`unsafeWindow`) Context:
  1. **`EventTarget.prototype.addEventListener` Patching**: Overrides `addEventListener` on `EventTarget.prototype` so that attempts by site code to register listeners for `copy`, `paste`, `contextmenu`, or `selectstart` are intercepted and discarded or filtered.
  2. **Shadow DOM Traversal**: Recursively scans and hooks into `attachShadow` (overriding `Element.prototype.attachShadow`) to ensure closed and open Shadow Roots are monitored for paste/copy restrictions.
  3. **`beforeinput` Filtering**: Specifically filters `beforeinput` event types with `inputType === 'insertFromPaste'`, preventing site code from canceling paste actions on modern rich input components.

```javascript
// Conceptual snippet: EventTarget addEventListener monkey patching pattern used by CY Fung
const rawAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener, options) {
  if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(type)) {
    // If site tries to register a handler that blocks copy/paste, suppress or wrap it
    if (isBlockedSite()) return;
  }
  return rawAddEventListener.call(this, type, listener, options);
};
```

### C. Script 3: Universal Bypass (#511405)
- **Author**: x3ric | **Installs**: 2,070 | **Updated**: Jan 2025 [C14](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L37)
- **Core Mechanism**: Lightweight inline handler nullifier. Iterates through all form elements on `DOMContentLoaded` and sets `element.onpaste = true`, `element.oncopy = true`.

---

## 3. Userscripts vs Extension Content Scripts: Architectural Comparison

| Architectural Vector | Userscripts (Tampermonkey/Violentmonkey) | Browser Extension (MV3 Content Scripts) |
|---|---|---|
| **Execution Context** | Direct access to `unsafeWindow` (Page `MAIN` World) | Isolated World by default; requires `world: 'MAIN'` or script injection |
| **Injection Timing** | `@run-at document-start` runs before inline `<head>` scripts | `document_start` in MV3 may run slightly after initial HTML parser |
| **Prototype Mutation Ability** | High (can patch `EventTarget.prototype` natively in page context) | Low in Isolated World; requires explicit execution in `MAIN` world |
| **Installation Requirement** | User must install Tampermonkey extension first | Standalone extension from Web Store |
| **Auto-Updates** | Dependent on userscript manager sync | Automatic Chrome / Browser Web Store update process |

---

## 4. Key Innovations & Advanced Techniques Discovered

1. **`EventTarget.prototype.addEventListener` Suppression**: Intercepting event listener registration *at definition time* prevents the event listener from ever being added, eliminating the need to race with `e.stopImmediatePropagation()`.
2. **Shadow Root Hooking (`Element.prototype.attachShadow`)**: Intercepting shadow root creation guarantees that components inside web components/Shadow DOM are unblocked.
3. **`MutationObserver` Attribute Stripping**: Automatically removes inline `onpaste="return false;"` attributes on dynamically rendered elements.

---

## 5. Weaknesses & Failure Modes

1. **Performance Cost of Continuous Mutation Observers**: Observing `subtree: true` on massive DOM trees (e.g. infinite scroll feeds) causes CPU overhead and layout thrashing if attribute clearing logic is unoptimized.
2. **Framework Breakage via Prototype Patching**: Blanket patching of `EventTarget.prototype.addEventListener` can break legitimate site event listeners (e.g. analytics, custom rich text editors, drag/drop handles).
3. **Prerequisite Dependency**: Requires users to install and manage a userscript engine.

---

## 6. Summary Rating for Greasyfork Userscripts

| Metric | Score (1-5) | Comment |
|---|---|---|
| **Technical Innovation (Unblocking Techniques)** | 4.8 / 5 | Pioneered prototype patching & Shadow DOM interception. |
| **Efficacy on Aggressive Paste Blockers** | 4.5 / 5 | Extremely effective due to early `MAIN` world execution. |
| **Performance & Resource Efficiency** | 3.0 / 5 | MutationObservers can cause high CPU usage on large DOMs. |
| **User Accessibility** | 2.0 / 5 | High friction setup requiring userscript host managers. |
