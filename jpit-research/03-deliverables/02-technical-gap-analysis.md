# Technical Gap Analysis & Anti-Bypass Architecture

## 1. Executive Summary

Paste blocking on modern web applications has evolved from simple HTML inline attributes (`onpaste="return false;"`) into sophisticated multi-layered anti-user techniques. Legacy extensions fail because they treat paste unblocking as a single event-listening problem (`e.stopImmediatePropagation()`).

This document details the **8 technical gap categories**, framework failure modes, edge cases, security considerations, and browser policy constraints that jPit v1.0 must solve to deliver 100% reliable paste unblocking.

---

## 2. Deep Technical Breakdown of 8 Anti-Bypass Vectors

### Gap 1: Controlled Inputs & Framework Synthetic State Desynchronization (React / Vue / Angular)

#### The Problem
Modern web frameworks use virtual DOMs and controlled components. In React, input elements are updated via synthetic state (`value={this.state.val}`). 
When a user pastes into a controlled input field:
1. Native `paste` event fires.
2. Legacy extensions call `e.stopImmediatePropagation()`.
3. The browser inserts the text into the native DOM element's `.value` property.
4. **Failure**: React's synthetic event handler never receives the event because propagation was stopped. React's internal state remains unchanged. When the component re-renders or form validation executes, React overwrites the DOM node's value back to the empty internal state.

```
User Pastes Text ──► Extension stops propagation ──► Native DOM node updated
                                                             │
                                                             ▼
                                                    React State NOT updated
                                                             │
                                                             ▼
                                                    On next submit / change:
                                                    React overwrites DOM node with ""
```

#### Technical Solution for jPit
jPit must execute a **Framework State Synthesizer**:
1. Intercept the native paste event.
2. Read the clipboard text payload.
3. Programmatically set the target element's native input setter:
   ```javascript
   const nativeValueSetter = Object.getOwnPropertyDescriptor(
     window.HTMLInputElement.prototype, 'value'
   ).set;
   nativeValueSetter.call(targetElement, newPastedValue);
   ```
4. Dispatch a synthetic, bubbling `input` and `change` event so framework listeners update internal state:
   ```javascript
   targetElement.dispatchEvent(new Event('input', { bubbles: true }));
   targetElement.dispatchEvent(new Event('change', { bubbles: true }));
   ```

---

### Gap 2: The `beforeinput` Event Vector (`insertFromPaste`)

#### The Problem
W3C Input Events Level 2 introduces `beforeinput`. Modern banking sites and security-conscious forms attach listeners to `beforeinput`:

```javascript
// Site anti-paste script
inputElement.addEventListener('beforeinput', (e) => {
  if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
    e.preventDefault(); // Cancels the paste before paste event even fires!
  }
});
```
Legacy extensions (DFWP, Allow Copy Paste) only listen for `paste` events. Because `beforeinput` fires *before* `paste`, `e.preventDefault()` on `beforeinput` suppresses the paste action before legacy extensions can even process it.

#### Technical Solution for jPit
jPit must register capturing phase listeners for both `beforeinput` and `paste`:
```javascript
document.addEventListener('beforeinput', (e) => {
  if (isUnblockActive() && (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop')) {
    e.stopImmediatePropagation(); // Prevent site handler from calling preventDefault()
  }
}, true);
```

---

### Gap 3: Closed Shadow DOM & Web Component Isolation

#### The Problem
Web Components using Shadow DOM isolate internal elements:
```javascript
const shadow = element.attachShadow({ mode: 'closed' });
shadow.innerHTML = `<input type="password" id="secure-pass">`;
```
Standard `document.addEventListener('paste', ...)` listeners receive re-targeted events where `e.target` is the outer host element. Standard document queries (`document.querySelector('input')`) cannot reach inside Shadow Roots.

#### Technical Solution for jPit
1. **Prototype Hooking in MAIN World**: jPit patches `Element.prototype.attachShadow` at document start to collect references to all created Shadow Roots (both `open` and `closed`).
2. **Shadow Listener Attachment**: Automatically attaches jPit capturing listeners directly to newly attached Shadow Roots.

```javascript
const originalAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function(init) {
  const shadowRoot = originalAttachShadow.apply(this, arguments);
  jPit.attachUnblockListeners(shadowRoot);
  return shadowRoot;
};
```

---

### Gap 4: Inline Event Handlers & Dynamic DOM Re-binding

#### The Problem
Legacy HTML uses inline attributes (`<input onpaste="return false;">`) or sets `element.onpaste = () => false`. 
Additionally, Single Page Applications (SPAs) dynamically inject elements into the DOM after page load.

#### Technical Solution for jPit
1. **Property Descriptor Neutralization**: Override `onpaste`, `oncopy`, `oncut`, `oncontextmenu`, and `onselectstart` on `HTMLElement.prototype` so setting them to function handlers that return `false` is safely ignored or neutralized.
2. **Optimized MutationObserver**: Observe subtree node additions and immediately strip `onpaste`, `oncopy`, `oncontextmenu` attributes from elements before user interaction occurs.

---

### Gap 5: System Hotkey Hijacking (`keydown` `preventDefault`)

#### The Problem
Sites block paste without touching paste events by stealing keyboard shortcuts:
```javascript
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    e.preventDefault(); // Blocks Ctrl+V / Cmd+V
  }
});
```

#### Technical Solution for jPit
Attach a high-priority capturing `keydown` listener on `window`:
```javascript
window.addEventListener('keydown', (e) => {
  const isPasteKey = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';
  if (isPasteKey && isUnblockActive()) {
    e.stopImmediatePropagation(); // Stop site script from executing preventDefault()
  }
}, true);
```

---

### Gap 6: Clipboard API Overrides & Zero-Width Space Injection

#### The Problem
Sites attempt to corrupt copied or pasted text by:
1. Overriding `navigator.clipboard.readText` and `writeText`.
2. Injecting invisible zero-width spaces (`\u200B`) or attribution text ("Read more at example.com") during `copy` events.

#### Technical Solution for jPit
1. **Clipboard API Shield**: Preserve pristine references to native `navigator.clipboard.readText` and `writeText` before site scripts execute.
2. **Clipboard Content Sanitizer Option**: An optional user toggle in jPit to strip trailing tracking URLs, zero-width spaces, and invisible formatting artifacts upon copy/paste.

---

### Gap 7: Canvas-Based & Virtualized Text Editors (Google Docs Canvas, Monaco Editor)

#### The Problem
Modern web applications (e.g. Google Docs Canvas rendering engine, Figma, custom canvas IDEs) do not use native standard `<input>` or `<textarea>` DOM elements. Instead, they capture keystrokes on a hidden off-screen textarea and render text directly onto a HTML5 `<canvas>`.

#### Technical Solution for jPit
- For off-screen hidden textareas, jPit ensures paste events directed at off-screen inputs are unblocked.
- For pure canvas engines, jPit provides a **Context Menu "Force Paste Text" Action** that prompts for clipboard permission and programmatically dispatches synthetic text input events directly to the document active element.

---

### Gap 8: Obfuscated Event Handlers & Third-Party Anti-Bot Scripts

#### The Problem
Anti-bot scripts (e.g. DataDome, PerimeterX, Cloudflare Turnstile, custom obfuscated scripts) hook into event listeners using minified code and custom event dispatchers.

#### Technical Solution for jPit
By operating at the `EventTarget.prototype.addEventListener` level in the `MAIN` world at `document_start`, jPit executes *before* third-party anti-bot scripts initialize, granting jPit absolute priority in event routing.

---

## 3. Security, Performance & Browser Policy Risks

### A. Manifest V3 Service Worker Delays & Lifecycle
- **Risk**: In MV3, background service workers terminate after 30 seconds of inactivity. Cold start latency when querying storage can cause content scripts to miss early `document_start` paste events.
- **jPit Mitigation**: Store active site rules directly in `sessionStorage` / local memory within the content script, eliminating async background worker roundtrips during event processing.

### B. CSP (Content Security Policy) Compliance
- **Risk**: Sites with `script-src 'self'` block extensions from injecting inline `<script>` tags.
- **jPit Mitigation**: Use Chrome's MV3 native `chrome.scripting.registerContentScripts` API with `world: 'MAIN'`, which bypasses page CSP headers legally and securely.

### C. Browser Store Review Scrutiny
- **Risk**: Requesting broad permissions like `<all_urls>` and `clipboardRead` triggers manual Chrome Web Store and Firefox Add-ons review delays.
- **jPit Mitigation**: Use `activeTab` or optional host permissions where possible, document permission rationale clearly in manifest descriptions, and avoid using `eval()`.

---

## 4. Summary Matrix of Technical Solutions

| Vector / Gap | Legacy Extensions | jPit v1.0 Architectural Solution |
|---|---|---|
| **React Controlled Inputs** | Fails (State overwritten) | Native property setter call + synthetic `input`/`change` event dispatch |
| **`beforeinput` Blocking** | Unhandled | Capturing phase listener on `beforeinput` (`inputType === 'insertFromPaste'`) |
| **Shadow DOM Elements** | Fails (Document level only) | Prototype patch `Element.prototype.attachShadow` + shadow listener registration |
| **Hotkey Hijacking (Ctrl+V)** | Unhandled | Capturing `keydown` listener at `window` level suppressing `preventDefault` |
| **Inline Attributes (`onpaste`)** | Partial / Fails | Property descriptor override on `HTMLElement.prototype` + `MutationObserver` |
| **Clipboard Corruption** | Unhandled | Safe Clipboard API Proxy + optional invisible character sanitizer |
| **CSP Inline Script Block** | Fails on CSP sites | MV3 `chrome.scripting` native `MAIN` world registration |
