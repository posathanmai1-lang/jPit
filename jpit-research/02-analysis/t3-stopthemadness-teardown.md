# Tier 3 Competitor Teardown: StopTheMadness (Pro)

## 1. Overview & Project Metadata

| Attribute | Details |
|---|---|
| **Extension Name** | StopTheMadness / StopTheMadness Pro |
| **Developer / Company** | Jeff Johnson / Underpass App Company [C8](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L25) |
| **Business Model** | Paid Commercial Software ($9.99 Mac/iOS App Store, lifetime/upgrades) |
| **Target Platforms** | Safari (macOS & iOS), Chrome (macOS), Firefox (macOS) |
| **Source Status** | Closed Source |
| **Primary Architecture** | Native macOS Host Application + Web Extension (MV3 / Safari Web Extension) |
| **Source Citation** | [C8](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L25), [C9](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L26), [C10](file:///d:/jPit/jpit-research/04-evidence/citation-log.md#L27) |

---

## 2. Technical Architecture & Engineering Paradigm

StopTheMadness Pro represents the benchmark commercial standard for browser behavior protection. Unlike simple web extensions, StopTheMadness operates via a native host app architecture paired with deep DOM event hooking.

```mermaid
graph TB
    subgraph Native Host (macOS Application)
        App[StopTheMadness Pro Native App]
        SettingsDB[(SQLite / NSUserDefaults Settings)]
        App --> SettingsDB
    end

    subgraph Browser Engine (Safari / Chrome / Firefox)
        SettingsDB --> |Native Messaging Bridge| ExtensionSW[Extension Background Process]
        ExtensionSW --> |Inject Configuration| CS[Content Script - Document Start]
        
        CS --> |MAIN World Deep Hooking| Engine[DOM Event & Property Override Engine]
        
        Engine --> H1[Event Interceptor: copy, paste, cut, beforeinput]
        Engine --> H2[Property Descriptor Overrides: Object.defineProperty]
        Engine --> H3[Hotkey Hijack Guard: keydown / keyup]
        Engine --> H4[CSS & Shadow DOM Injection]
    end
```

---

## 3. Deep Feature Set Teardown

StopTheMadness Pro goes far beyond paste unblocking, addressing an exhaustive suite of browser hijacking techniques:

### A. Advanced Paste & Copy Protection
- **`beforeinput` Event Hooking**: Intercepts `beforeinput` events with `inputType === 'insertFromPaste'` and neutralizes `preventDefault()`.
- **Synthetic Input Value Insertion**: When a paste event is blocked or neutralized by framework code, STM can programmatically update target element `.value` or `textContent` and dispatch synthetic `input` and `change` events to wake framework state handlers (React/Vue).
- **Clipboard API Guard**: Wraps `navigator.clipboard.readText()` and `navigator.clipboard.writeText()` using JS `Object.defineProperty` to prevent websites from overwriting clipboard contents or reading clipboard data without user initiation.

### B. Hotkey & Keyboard Hijack Guard
- Prevents web pages from intercepting system hotkeys:
  - `Cmd+C` / `Ctrl+C` (Copy)
  - `Cmd+V` / `Ctrl+V` (Paste)
  - `Cmd+X` / `Ctrl+X` (Cut)
  - `Cmd+A` / `Ctrl+A` (Select All)
- Listens on `keydown` during the capturing phase at `window`, inspecting `event.code` and modifier keys. If a forbidden system key combo is detected, calls `e.stopPropagation()` to prevent page JS from executing `e.preventDefault()`.

### C. Right-Click, Selection, & Drag Protection
- **Unblocks Right-Click**: Neutralizes `contextmenu` event cancellation and overrides `window.oncontextmenu` and `element.oncontextmenu`.
- **Unblocks Text Selection**: Prevents `selectstart` blocking and injects high-specificity CSS to neutralize `user-select: none`.
- **Unblocks Drag & Drop**: Neutralizes `dragstart`, `dragover`, and `drop` event blocking.

### D. Object & Event Target Property Overrides
Uses JavaScript prototype modification in the `MAIN` world to harden DOM APIs:

```javascript
// Conceptual STM property descriptor override pattern
Object.defineProperty(Event.prototype, 'preventDefault', {
  value: function() {
    if (this.type === 'paste' && isProtectedDomain(location.hostname)) {
      // Ignore site's attempt to cancel paste
      return;
    }
    return OriginalPreventDefault.apply(this, arguments);
  },
  writable: true,
  configurable: true
});
```

---

## 4. Granular Site Rules & Configuration Engine

StopTheMadness features an extensive rule engine:

1. **Global Default Presets**: Baseline rules applied across all web traffic.
2. **Domain-Specific Overrides**: Wildcards supported (e.g. `*.example.com`, `finance.bank.com`).
3. **Per-Feature Toggle Matrix**: Each domain can individually enable or disable:
   - Bring back copy/paste
   - Bring back contextual menus
   - Stop keyboard shortcuts hijacking
   - Show video controls
   - Strip link tracking parameters (`utm_*`, `gclid`, etc.)
   - Block `autocomplete="off"` overrides

---

## 5. Technical Strengths & Advantages

1. **Comprehensive Protection Matrix**: Solves paste blocking alongside hotkey hijacking, context menus, and clipboard manipulation.
2. **Framework Compatibility**: Uses synthetic event dispatching (`input`, `change`) to maintain compatibility with React, Angular, and Vue.
3. **Native Stability**: Native host storage avoids Chrome extension sync storage limits and lifecycle service worker wipes.

---

## 6. Limitations & Vulnerabilities

1. **Platform Lock-In**: macOS and iOS native application model. Does not support Windows, Linux, or Android natively.
2. **Cost Barrier**: $9.99 upfront fee creates entry friction compared to free web store extensions.
3. **UI Complexity**: Settings UI is dense and technical, presenting a steep learning curve for non-technical users.
4. **Site Breakdown Risk**: Heavy-handed property descriptor modification (`Object.defineProperty`) can break complex web tools (e.g., Canva, Webflow, Figma) that rely on custom event pipelines.

---

## 7. Summary Rating for StopTheMadness Pro

| Metric | Score (1-5) | Comment |
|---|---|---|
| **Efficacy across All Web Apps** | 4.9 / 5 | Benchmark efficacy; handles synthetic events & framework inputs. |
| **Feature Depth & Versatility** | 5.0 / 5 | Industry leader in browser anti-hijacking protections. |
| **Cross-Platform Availability** | 2.0 / 5 | Restricted to Apple ecosystem (macOS / iOS). |
| **User Experience & Configuration** | 3.8 / 5 | Extremely powerful, but dense technical options UI. |
