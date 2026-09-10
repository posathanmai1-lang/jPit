# Tier 2 Competitor Teardown: Allow Copy Paste (+)

## 1. Overview & Project Metadata

| Attribute | Details |
|---|---|
| **Extension Name** | Allow Copy Paste (+) / Allow Copy Paste |
| **Developer / Author** | Fraser Benjamin (and derivatives) [C5](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L16) |
| **Version Analyzed** | 1.1.0 (Manifest V3) |
| **License** | Open Source / Freeware |
| **Target Browsers** | Chrome, Edge, Brave |
| **Primary Architecture** | Popup Toolbar Toggle + Content Script DOM Script Injection + CSS Injection |
| **Source Citation** | [C5](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L16), [C6](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L17), [C7](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L18) |

---

## 2. Technical Architecture & Injection Mechanics

Allow Copy Paste (+) expands upon basic event stopping by adding CSS rule injection and direct event listener unbinding in the DOM context.

```mermaid
graph TD
    User([User Clicks Extension Icon]) --> Popup[Popup UI / Toolbar Button]
    Popup --> SW[Background Service Worker]
    SW --> |chrome.tabs.sendMessage| CS[Content Script - ISOLATED World]
    CS --> |Inject <script> tag| MAIN[MAIN World / Page Context]
    CS --> |Inject <style> tag| DOM[DOM Head - CSS Inserter]
    
    MAIN --> |Override Event Handlers| E1[Reset window.onpaste, document.oncopy, etc. to null]
    MAIN --> |Add Event Interceptors| E2[addEventListener capturing listeners with stopPropagation]
    DOM --> |Apply Styles| S1[* { user-select: auto !important; -webkit-user-select: auto !important; }]
```

### Script Execution Injection Modes
Unlike T1 which operates strictly within Chrome's `ISOLATED` execution world, T2 extensions inject inline `<script>` tags or execute scripts in the `MAIN` execution world.

```javascript
// Conceptual T2 injection pattern into MAIN execution world
const script = document.createElement('script');
script.textContent = `
  (function() {
    const events = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, function(e) {
        e.stopPropagation();
      }, true);
      window['on' + event] = null;
      document['on' + event] = null;
    });
  })();
`;
(document.head || document.documentElement).appendChild(script);
script.remove();
```

---

## 3. Scope of Unblocking Capabilities

Allow Copy Paste (+) broadens the unblocking surface compared to T1:

| Unblocking Surface | T1 (DFWP) | T2 (Allow Copy Paste) | Implementation Details in T2 |
|---|---|---|---|
| **Paste Event** | Yes | Yes | Capturing listener + handler clearing |
| **Copy Event** | Yes | Yes | Capturing listener + handler clearing |
| **Cut Event** | Yes | Yes | Capturing listener + handler clearing |
| **Right-Click Context Menu** | No | Yes | Intercepts `contextmenu` event & unbinds `oncontextmenu` |
| **Text Selection (`selectstart`)** | No | Yes | Intercepts `selectstart` event & unbinds `onselectstart` |
| **CSS Selection Lock** | No | Yes | Injects `* { user-select: auto !important; }` |
| **Drag & Drop (`dragstart`)** | No | Yes | Intercepts `dragstart` event |

---

## 4. Per-Tab Toggle State & Storage Mechanics

- **Activation State**: T2 relies primarily on a manual user toggle via the action popup.
- **Badge Indicator**: Changes badge text/icon color on a per-tab basis (e.g. green "ON", gray "OFF").
- **Persistence**: Tab state is held in `chrome.storage.local` indexed by domain origin or tab ID.

---

## 5. Technical Strengths & Advantages

1. **Unlocks Text Selection & Right-Click**: Solves copy-protection mechanisms that operate by disabling right-clicks (`oncontextmenu="return false;"`) or text highlight (`user-select: none`).
2. **MAIN World Access**: By accessing the `MAIN` execution world, T2 can nullify site-defined properties directly on `window` and `document` objects (`window.onpaste = null`).
3. **CSS Forced Override**: Injected CSS overrides aggressive site stylesheet declarations blocking selection.

---

## 6. Vulnerabilities, Failure Modes & Edge Cases

### A. Heavy Page Side Effects (Global Enablement Breakdown)
- Injected `* { user-select: auto !important; }` disrupts UI components reliant on text unselectability (e.g., custom slider widgets, drag-and-drop kanban boards, interactive canvas tools, button labels).
- Intercepting `contextmenu` globally breaks custom right-click menus on web applications like Figma, Google Sheets, VS Code Web, and webmail clients.

### B. Dynamic DOM & SPA Re-binding Bypass
- Single Page Applications (React/Vue/Angular) dynamically render elements *after* initial script execution. If a site attaches an `onpaste` listener directly to a newly rendered `<input>` element at runtime, T2's initial handler reset fails to clear it unless an active `MutationObserver` or persistent capturing listener is maintained.

### C. `beforeinput` & Keyboard Shortcuts Unhandled
- T2 does not manage `beforeinput` events.
- Does not handle sites that intercept hotkeys via `keydown` (e.g. `e.ctrlKey && e.key === 'v'` with `e.preventDefault()`).

### D. Security & CSP Blockers
- Injected `<script>` tag injection into DOM in `ISOLATED` world is blocked on sites with strict Content Security Policy (CSP) headers prohibiting inline scripts (`script-src 'self'`). In MV3, extensions must use `chrome.scripting.executeScript({ world: 'MAIN' })` instead of DOM script injection to circumvent CSP restrictions.

---

## 7. Review & Feedback Synthesis (C7)

Review analysis across Chrome Web Store and chrome-stats.com [C7](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L18) highlights key user pain points:

1. **"Site Broke" Complaints**: Users report that keeping the extension enabled breaks normal web navigation (e.g. dropdown menus stop closing, custom UI context menus break).
2. **Lack of Automated Domain Rules**: Requires users to manually click the extension icon on every new site rather than remembering domain preferences reliably.
3. **Partial Paste Failure on Modern Inputs**: Works on 80% of simple blogs/news sites, but fails on web apps using synthetic inputs (e.g., Google Docs, CodePen, banking forms).

---

## 8. Summary Rating for Allow Copy Paste (+)

| Metric | Score (1-5) | Comment |
|---|---|---|
| **Efficacy on Simple Websites** | 4.8 / 5 | Excellent for blogs, recipe sites, and standard copy-protected pages. |
| **Efficacy on Complex Web Apps** | 2.0 / 5 | Causes severe UI side effects; fails on complex synthetic editors. |
| **Feature Surface Coverage** | 3.8 / 5 | Covers copy/paste, right-click, select, and CSS selection locks. |
| **UI / UX & Rule Management** | 2.5 / 5 | Primitive popup, manual per-tab toggle, no granular domain rules. |
